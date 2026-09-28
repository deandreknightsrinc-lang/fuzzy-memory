
function HandleMIDI(event) {
  var shift = GetParameter("Octave") * 12;
  if (event instanceof NoteOn && event.velocity > 0) {
    var vel = Math.max(event.velocity, GetParameter("Velocity Floor"));
    engineNoteOn(clamp(event.pitch + shift, 0, 127), vel, event.channel);
    return;
  }
  if (event instanceof NoteOff || (event instanceof NoteOn && event.velocity === 0)) {
    engineNoteOff(clamp(event.pitch + shift, 0, 127), event.channel);
    return;
  }
  if (event instanceof PitchBend) return;   // the engine owns pitch bend
  event.send();
}

function ProcessMIDI() { engineProcess(); }
function Reset() { engineReset(); }
