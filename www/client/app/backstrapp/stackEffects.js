define([
  'underscore',
  './effects/FadeEffect',
  './effects/NoEffect',
  './effects/SlideEffect',
  './effects/StackEffect'
],

function(_, Fade, No, Slide, Stack) {

  var transitions = {
    no: new No(),
    slide: new Slide(),
    fade: new Fade(),
    stack: new Stack()
  };

  return transitions;

});