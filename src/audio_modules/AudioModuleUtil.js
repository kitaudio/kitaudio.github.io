'use strict';

/**
 * A collection of static utility methods for Audio Modules
 */
let AudioModuleUtil = {

  /**
   * Convert MIDI pitch to frequency
   * @param {number} midiPitch - The midi pitch number.
   * @param {number} [a4tuning=440] - Tuning of the note A4 (midi pitch 69) in Hz, 440Hz by default.
   * @return {number} freq - Frequency for the given MIDI pitch.
   */
  midiToFreq: function (midiPitch, a4tuning) {
    a4tuning = a4tuning || 440;
    let freq = -1;

    if (midiPitch !== -1) freq = Math.pow(2, (midiPitch - 69) / 12) * 440;
    return freq;
  },

  /**
   * Convert note name to MIDI pitch
   * @param {string} noteName - The note name to convert
   * @return {number} midiPitch - MIDI pitch for the given note name. Return -1 if invalid argument format.
   */
  noteNameToMidi: function (noteName) {
    let noteNameFormat = /^([a-g]|[A-G])(#|b)?([0-9]|10)$/;

    if(noteNameFormat.test(noteName) === false) {
      console.log('AudioModuleUtil.noteNameToMidi: invalid note name format');
      return -1;
    } else {
      let capture = noteNameFormat.exec(noteName);

      let note = capture[1];
      let accidental = capture[2];
      let octave = capture[3];

      let noteFundamentalMap = {
        'A': 9,
        'a': 9,
        'B': 11,
        'b': 11,
        'C': 0,
        'c': 0,
        'D': 2,
        'd': 2,
        'E': 4,
        'e': 4,
        'F': 5,
        'f': 5,
        'G': 7,
        'g': 7
      };

      let noteFundamental = noteFundamentalMap[note];

      if(accidental === '#') {
        noteFundamental++;
      } else if (accidental === 'b') {
        noteFundamental--;
      }

      let midiPitch = noteFundamental + (12 * octave);

      return midiPitch;
    }
  },

  /**
   * Convert note name to frequency
   * @param {string} noteName - The note name to convert
   * @param {number} [a4tuning=440] - Tuning of the note A4 (midi pitch 69) in Hz, 440Hz by default.
   * @return {number} freq - Frequency for the given MIDI pitch.
   */
  noteNameToFreq: function (noteName, a4tuning) {
    a4tuning = a4tuning || 440;
    return AudioModuleUtil.midiToFreq(AudioModuleUtil.noteNameToMidi(noteName), a4tuning);
  },

  /**
   * Shim the WebAudio connect and disconnect methods to allow WebAudio nodes to connect to Audio Modules
   */
  shimWebAudioConnect: function (audioCtx) {
    let audioNodePrototype = Object.getPrototypeOf(Object.getPrototypeOf(audioCtx.createGain()));

    // keep a reference to the original connect and disconnect methods as webAudioConnect and webAudioDisconnect
    audioNodePrototype.webAudioConnect = audioNodePrototype.connect;
    audioNodePrototype.webAudioDisconnect = audioNodePrototype.disconnect;

    // if the destination object has an 'input' property, it is an Audio Module - connect to 'input'
    // else it is an AudioNode - connect directly
    audioNodePrototype.connect = function (destination, outputIndex, inputIndex) {
      if (typeof destination.input === "object") {
        this.webAudioConnect(destination.input, outputIndex, inputIndex);
      } else {
        this.webAudioConnect(destination, outputIndex, inputIndex);
      }
    };

    audioNodePrototype.disconnect = function (destination, outputIndex, inputIndex) {
      if (typeof destination.input === "object") {
        this.webAudioDisconnect(destination.input, outputIndex, inputIndex);
      } else {
        this.webAudioDisconnect(destination, outputIndex, inputIndex);
      }
    };
  }
}

export default AudioModuleUtil;