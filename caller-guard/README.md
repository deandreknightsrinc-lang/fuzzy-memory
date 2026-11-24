# Caller Guard

A phone web app for blocked and unknown callers. Open it on the iPhone in Safari and use **Share › Add to Home Screen**.

- **Set up**: the iPhone settings that make the phone read every caller out loud (Announce Calls), answer unknown and blocked callers and ask who they are (Screen Unknown Callers), and show voicemails live. Android steps too.
- **Check**: paste or type a number. It reads it out loud, shows the state or country from the area code, and warns about one-ring Caribbean numbers, 900 numbers, spoofed numbers and calls faking your own prefix. Works offline, nothing is sent anywhere.
- **Log**: write down who called and what they said, read the log out loud, export to CSV. Saved only on the phone.
- `?n=<number>` opens straight to a check, for an iPhone Shortcut (steps in the app).

No app can reveal the number behind "No Caller ID": carriers never send it to the phone. Paid call-forwarding services such as TrapCall are the only route, and the app explains that.

Tests: `node --test caller-guard/tests/*.test.js`
