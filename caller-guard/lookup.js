// Caller Guard number lookup: pure functions, no network. Works in the browser
// (window.CallerLookup) and in Node (module.exports) so it can be tested.
(function (root) {
  'use strict';

  // North American area codes by state, province or territory.
  var AREA = {
    'Alabama': '205 251 256 334 659 938',
    'Alaska': '907',
    'Arizona': '480 520 602 623 928',
    'Arkansas': '479 501 870',
    'California': '209 213 279 310 323 341 350 369 408 415 424 442 510 530 559 562 619 626 628 650 657 661 669 707 714 738 747 760 805 818 820 831 837 840 858 909 916 925 949 951',
    'Colorado': '303 719 720 970 983',
    'Connecticut': '203 475 860 959',
    'Delaware': '302',
    'District of Columbia': '202 771',
    'Florida': '239 305 321 324 352 386 407 448 561 645 656 689 727 728 754 772 786 813 850 863 904 941 954',
    'Georgia': '229 404 470 478 678 706 762 770 912 943',
    'Hawaii': '808',
    'Idaho': '208 986',
    'Illinois': '217 224 309 312 331 447 464 618 630 708 730 773 779 815 847 861 872',
    'Indiana': '219 260 317 463 574 765 812 930',
    'Iowa': '319 515 563 641 712',
    'Kansas': '316 620 785 913',
    'Kentucky': '270 364 502 606 859',
    'Louisiana': '225 318 337 504 985',
    'Maine': '207',
    'Maryland': '227 240 301 410 443 667',
    'Massachusetts': '339 351 413 508 617 774 781 857 978',
    'Michigan': '231 248 269 313 517 586 616 679 734 810 906 947 989',
    'Minnesota': '218 320 507 612 651 763 924 952',
    'Mississippi': '228 601 662 769',
    'Missouri': '235 314 417 557 573 636 660 816',
    'Montana': '406',
    'Nebraska': '308 402 531',
    'Nevada': '702 725 775',
    'New Hampshire': '603',
    'New Jersey': '201 551 609 640 732 848 856 862 908 973',
    'New Mexico': '505 575',
    'New York': '212 315 329 332 347 363 516 518 585 607 624 631 646 680 716 718 838 845 914 917 929 934',
    'North Carolina': '252 336 472 704 743 828 910 919 980 984',
    'North Dakota': '701',
    'Ohio': '216 220 234 283 326 330 380 419 436 440 513 567 614 740 937',
    'Oklahoma': '405 539 572 580 918',
    'Oregon': '458 503 541 971',
    'Pennsylvania': '215 223 267 272 412 445 484 570 582 610 717 724 814 835 878',
    'Rhode Island': '401',
    'South Carolina': '803 821 839 843 854 864',
    'South Dakota': '605',
    'Tennessee': '423 615 629 731 865 901 931',
    'Texas': '210 214 254 281 325 346 361 409 430 432 469 512 682 713 726 737 806 817 830 832 903 915 936 940 945 956 972 979',
    'Utah': '385 435 801',
    'Vermont': '802',
    'Virginia': '276 434 540 571 686 703 757 804 826 948',
    'Washington': '206 253 360 425 509 564',
    'West Virginia': '304 681',
    'Wisconsin': '262 274 414 534 608 715 920',
    'Wyoming': '307',
    'Puerto Rico': '787 939',
    'U.S. Virgin Islands': '340',
    'Guam': '671',
    'Northern Mariana Islands': '670',
    'American Samoa': '684',
    'Canada': '204 226 236 249 250 257 263 289 306 343 354 365 367 368 382 387 403 416 418 428 431 437 438 450 468 474 506 514 519 548 579 581 584 587 604 613 639 647 672 683 705 709 742 753 778 780 782 807 819 825 867 873 879 902 905 942'
  };

  // Caribbean and Atlantic area codes. They dial like a U.S. number but are
  // international, and are used in the "one ring" callback scam.
  var CARIBBEAN = {
    '242': 'Bahamas', '246': 'Barbados', '264': 'Anguilla', '268': 'Antigua and Barbuda',
    '284': 'British Virgin Islands', '345': 'Cayman Islands', '441': 'Bermuda', '473': 'Grenada',
    '649': 'Turks and Caicos', '658': 'Jamaica', '664': 'Montserrat', '721': 'Sint Maarten',
    '758': 'St. Lucia', '767': 'Dominica', '784': 'St. Vincent and the Grenadines',
    '809': 'Dominican Republic', '829': 'Dominican Republic', '849': 'Dominican Republic',
    '868': 'Trinidad and Tobago', '869': 'St. Kitts and Nevis', '876': 'Jamaica'
  };

  var TOLL_FREE = ['800', '833', '844', '855', '866', '877', '888'];
  var PREMIUM = ['900'];

  var BY_CODE = {};
  Object.keys(AREA).forEach(function (place) {
    AREA[place].split(' ').forEach(function (code) { BY_CODE[code] = place; });
  });

  var BLOCKED_WORDS = /^(blocked|private|restricted|unknown|anonymous|no caller id|unavailable|no caller)/i;

  // Turn whatever was pasted into { kind, digits, areaCode, display }.
  function normalize(input) {
    var raw = String(input == null ? '' : input).trim();
    if (!raw || BLOCKED_WORDS.test(raw)) {
      return { kind: 'hidden', raw: raw, digits: '', display: raw ? 'No Caller ID' : '' };
    }
    var plus = raw.charAt(0) === '+';
    var digits = raw.replace(/\D/g, '');
    if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
    else if (plus && digits.charAt(0) !== '1') {
      return { kind: 'international', raw: raw, digits: digits, display: '+' + digits };
    } else if (digits.length > 11 && digits.indexOf('011') === 0) {
      return { kind: 'international', raw: raw, digits: digits.slice(3), display: '+' + digits.slice(3) };
    }
    if (digits.length !== 10) {
      return { kind: digits.length >= 3 && digits.length <= 6 ? 'short' : 'invalid', raw: raw, digits: digits, display: digits };
    }
    var area = digits.slice(0, 3);
    return {
      kind: 'nanp', raw: raw, digits: digits, areaCode: area,
      display: '(' + area + ') ' + digits.slice(3, 6) + '-' + digits.slice(6)
    };
  }

  // Look a number up and return what we can tell about it, plus warnings.
  // `mine` is the user's own number (optional), used to spot "neighbor" spoofing.
  function lookup(input, mine) {
    var n = normalize(input);
    var out = { number: n, place: null, type: 'unknown', flags: [], risk: 'unknown' };
    if (n.kind === 'hidden') {
      out.type = 'hidden';
      out.risk = 'caution';
      out.flags.push('The caller hid their number. No app or website can show it: carriers never send it to your phone. Let screening or voicemail handle it.');
      return out;
    }
    if (n.kind === 'international') {
      out.type = 'international';
      out.risk = 'caution';
      out.flags.push('International number. If you do not know anyone in that country, do not call back.');
      return out;
    }
    if (n.kind === 'short') {
      out.type = 'short code';
      out.risk = 'low';
      out.flags.push('Short code: usually texts from banks, deliveries or 2-factor codes. Never reply with a code you did not ask for.');
      return out;
    }
    if (n.kind !== 'nanp') {
      out.type = 'invalid';
      out.flags.push('That does not look like a full phone number. A U.S. number has 10 digits.');
      return out;
    }
    var a = n.areaCode;
    if (TOLL_FREE.indexOf(a) >= 0) {
      out.type = 'toll-free';
      out.place = 'Toll-free (no location)';
      out.risk = 'low';
      out.flags.push('Toll-free numbers belong to businesses. Real companies are fine, but scammers rent these too. Call back on the number printed on your card or bill, not this one.');
    } else if (PREMIUM.indexOf(a) >= 0) {
      out.type = 'premium';
      out.place = 'Pay-per-call';
      out.risk = 'high';
      out.flags.push('900 numbers charge you per minute. Do not call back.');
    } else if (CARIBBEAN[a]) {
      out.type = 'caribbean';
      out.place = CARIBBEAN[a];
      out.risk = 'high';
      out.flags.push('This looks like a U.S. number but rings ' + CARIBBEAN[a] + '. Calling back can cost international rates. This is the classic "one ring" scam.');
    } else if (BY_CODE[a]) {
      out.type = 'local';
      out.place = BY_CODE[a];
      out.risk = 'unknown';
    } else {
      out.type = 'unassigned';
      out.risk = 'caution';
      out.flags.push('Area code ' + a + ' is not on our list. It may be brand new, but numbers like this are often faked (spoofed).');
    }
    if (/^[01]/.test(a) || /^[01]/.test(n.digits.slice(3))) {
      out.risk = 'high';
      out.flags.push('Real phone numbers never have a 0 or 1 in that spot. This number is spoofed.');
    }
    if (n.digits.slice(3, 6) === '555' && /^01/.test(n.digits.slice(6))) {
      out.flags.push('555-01xx numbers are fictional (used in movies and tests).');
    }
    var m = mine ? normalize(mine) : null;
    if (m && m.kind === 'nanp' && m.digits !== n.digits && m.digits.slice(0, 6) === n.digits.slice(0, 6)) {
      out.risk = out.risk === 'high' ? 'high' : 'caution';
      out.flags.push('Same area code and first 3 digits as your own number. Scammers copy your prefix so the call looks local ("neighbor spoofing").');
    }
    return out;
  }

  // Text for reading the caller out loud, digit by digit.
  function speakable(input) {
    var n = normalize(input);
    if (n.kind === 'hidden') return 'Blocked caller. No caller ID.';
    if (!n.digits) return 'Unknown caller.';
    var d = n.digits.split('');
    if (n.kind === 'nanp') {
      return d.slice(0, 3).join(' ') + ', ' + d.slice(3, 6).join(' ') + ', ' + d.slice(6).join(' ');
    }
    return d.join(' ');
  }

  var api = { normalize: normalize, lookup: lookup, speakable: speakable, AREA: AREA, CARIBBEAN: CARIBBEAN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CallerLookup = api;
})(this);
