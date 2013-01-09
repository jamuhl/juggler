define([
  'underscore',
  './effects/FadeEffect',
  './effects/NoEffect',
  './effects/SlideEffect',
  './effects/StackEffect'
],

function(_, Fade, No, Slide, Stack) {

  var transitions = {
    noEffect: new No(),
    slide: new Slide(),
    fade: new Fade(),
    stack: new Stack()
  };

  transitions.noEffect.reverse = new No();
  transitions.slide.reverse = new Slide({direction: 'right'});
  transitions.fade.reverse = new Fade();
  transitions.stack.reverse = new Stack({direction: 'right'});

  return transitions;

});