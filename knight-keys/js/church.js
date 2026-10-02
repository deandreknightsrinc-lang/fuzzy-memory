// Virtual church service: an order of service (welcome, worship, scripture,
// prayer, announcements, sermon, giving, benediction) that runs as big slides
// for the room or a livestream, with worship songs played by the Band Room and
// their lyrics on screen. A service is one portable file (.kservice), like
// course packs, with the church's own name, colors and links.

export const SERVICE_FORMAT = 'knight-service';

export const SEGMENT_TYPES = {
  welcome: { label: 'Welcome', icon: '👋' },
  song: { label: 'Worship song', icon: '🎶' },
  scripture: { label: 'Scripture reading', icon: '📖' },
  prayer: { label: 'Prayer', icon: '🙏' },
  announcement: { label: 'Announcements', icon: '📣' },
  sermon: { label: 'Sermon / message', icon: '🎤' },
  giving: { label: 'Giving', icon: '💝' },
  benediction: { label: 'Benediction', icon: '✨' },
  video: { label: 'Video', icon: '🎬' },
  slide: { label: 'Slide', icon: '🖼' },
};

/** A Sunday service to start from (scripture: King James Version, public domain). */
export function newService(church = 'BAC Ministries') {
  return {
    format: SERVICE_FORMAT,
    version: 1,
    id: `service-${Date.now().toString(36)}`,
    title: 'Sunday Worship Service',
    church: {
      name: church,
      tagline: 'Welcome home. We\'re glad you\'re here.',
      color: '#7c3aed',
      logo: '',
      giving: '',
      website: '',
      social: '',
    },
    poweredBy: true, // "Powered by BAC Ministries" on the stream screen
    segments: [
      { type: 'welcome', title: 'Welcome', text: 'Welcome to our worship service! Wherever you\'re joining from, we\'re glad you\'re here. Let\'s worship together.', host: 'melody-grace', video: '' },
      { type: 'song', title: 'Amazing Grace', song: 'lib:amazing' },
      { type: 'scripture', title: 'Psalm 100', reference: 'Psalm 100 (KJV)', text: 'Make a joyful noise unto the LORD, all ye lands. Serve the LORD with gladness: come before his presence with singing. Know ye that the LORD he is God: it is he that hath made us, and not we ourselves; we are his people, and the sheep of his pasture. Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name. For the LORD is good; his mercy is everlasting; and his truth endureth to all generations.' },
      { type: 'song', title: 'Jesus Loves Me', song: 'lib:jesusloves' },
      { type: 'prayer', title: 'Prayer', text: 'Let\'s pray together. Send your prayer requests in the comments or to the prayer team, and we will pray for you this week.', pad: true },
      { type: 'announcement', title: 'Announcements', text: 'Bible study: Wednesday at 7 PM\nYouth and choir rehearsal: Saturday at 10 AM\nNew here? Say hello in the comments!' },
      { type: 'sermon', title: 'Today\'s Message', text: 'Speaker and message title', video: '', notes: '' },
      { type: 'giving', title: 'Giving', text: 'Thank you for supporting the ministry. Your giving helps us reach more people with the Gospel.' },
      { type: 'benediction', title: 'Benediction', reference: 'Numbers 6:24-26 (KJV)', text: 'The LORD bless thee, and keep thee: The LORD make his face shine upon thee, and be gracious unto thee: The LORD lift up his countenance upon thee, and give thee peace.' },
    ],
  };
}

/** Problems with a service (empty = ready to run). */
export function validateService(svc) {
  const errors = [];
  if (!svc || svc.format !== SERVICE_FORMAT) return ['Not a Knight service file (.kservice).'];
  if (!svc.title) errors.push('The service needs a title.');
  if (!svc.church?.name) errors.push('Add your church\'s name.');
  if (!Array.isArray(svc.segments) || !svc.segments.length) errors.push('Add at least one part to the service.');
  (svc.segments || []).forEach((s, i) => {
    const where = `Part ${i + 1}`;
    if (!SEGMENT_TYPES[s.type]) errors.push(`${where}: unknown kind "${s.type}".`);
    if (s.type === 'song' && !s.song) errors.push(`${where}: pick a song.`);
    if (s.type === 'video' && !s.video) errors.push(`${where}: add the video link.`);
  });
  return errors;
}

/**
 * What the screen shows for a part of the service. `extra` carries live things
 * like the lyric lines of the song that's playing.
 */
export function stageFrame(svc, index, extra = {}) {
  const s = svc.segments[index];
  const c = svc.church || {};
  const frame = {
    church: c.name || '',
    tagline: c.tagline || '',
    color: c.color || '#7c3aed',
    logo: c.logo || '',
    footer: [c.website, c.social].filter(Boolean).join('  ·  '),
    poweredBy: svc.poweredBy !== false,
    kind: s?.type || 'blank',
    title: s?.title || '',
    text: '',
    reference: '',
    video: '',
    lyricNow: extra.lyricNow || '',
    lyricNext: extra.lyricNext || '',
    progress: `${index + 1} / ${svc.segments.length}`,
  };
  if (!s) return frame;
  switch (s.type) {
    case 'song':
      frame.text = extra.lyricNow ? '' : 'Sing along: the words appear here.';
      break;
    case 'scripture':
    case 'benediction':
      frame.text = s.text || '';
      frame.reference = s.reference || '';
      break;
    case 'giving':
      frame.text = [s.text, c.giving ? `Give: ${c.giving}` : ''].filter(Boolean).join('\n\n');
      break;
    case 'sermon':
    case 'video':
    case 'welcome':
      frame.text = s.text || '';
      frame.video = s.video || '';
      break;
    default:
      frame.text = s.text || '';
  }
  return frame;
}

/** A social media post inviting people to the service. */
export function invitePost(svc, when = 'this Sunday') {
  const c = svc.church || {};
  const songs = svc.segments.filter((s) => s.type === 'song').map((s) => s.title);
  const msg = svc.segments.find((s) => s.type === 'sermon');
  return [
    `🙌 Join ${c.name || 'us'} live ${when} for ${svc.title}!`,
    msg?.text && msg.text !== 'Speaker and message title' ? `🎤 ${msg.text}` : '',
    songs.length ? `🎶 Worship: ${songs.join(', ')}` : '',
    c.website ? `🔗 ${c.website}` : '',
    'Share this with someone who needs some hope today. 💜',
  ].filter(Boolean).join('\n');
}

/** What the host says, for a host character's video (welcome, announcements, giving). */
export function hostScript(svc, segment, host) {
  const c = svc.church || {};
  const lines = [`[SCENE] ${host.name} welcomes viewers in front of a ${c.name || 'church'} banner. Warm, friendly, medium close-up.`, ''];
  lines.push(`${host.name.toUpperCase()}: ${segment.text}`);
  if (segment.type === 'welcome') lines.push(`${host.name.toUpperCase()}: Grab a seat, invite a friend to watch with you, and let's worship together.`);
  return lines.join('\n');
}

// ---- Saved services (this browser) --------------------------------------------------

const KEY = 'kk.services';
export function loadServices(storage = globalThis.localStorage) {
  try {
    const list = JSON.parse(storage?.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((s) => s?.format === SERVICE_FORMAT) : [];
  } catch {
    return [];
  }
}
export function saveServices(list, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or unavailable */
  }
}
