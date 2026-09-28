
function HandleMIDI(event) {
  var shift = GetParameter("Octave") * 12;
  if (event instanceof NoteOn && event.velocity > 0) {
    vibAnchor = Date.now();
    engineNoteOn(clamp(event.pitch + shift, 0, 127), event.velocity, event.channel);
    return;
  }
  if (event instanceof NoteOff || (event instanceof NoteOn && event.velocity === 0)) {
    var before = held.length;
    engineNoteOff(clamp(event.pitch + shift, 0, 127), event.channel);
    if (held.length > 0 && held.length < before) vibAnchor = Date.now();
    return;
  }
  if (event instanceof PitchBend) return;
  event.send();
}

function ProcessMIDI() { engineProcess(); }
function Reset() { engineReset(); }
