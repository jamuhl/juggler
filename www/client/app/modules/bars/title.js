define([
  'namespace'
],

function(ns) {
  var app = ns.app;

  // Create a new module
  var module = ns.module();

  module.Views.Title = ns.ItemView.extend({
    tagName: 'div',
    template: 'bars/title',

    allowAutoStackPositioning: true,

    initialize: function(options) {
      options = options || {};
      this.model = this.model || new ns.Model({
        title: options.title,
        back: options.back || 'back',
        next: options.next || 'next'
      });
    },

    events: {
      'click .back': 'ui_back',
      'click .next': 'ui_next'
    },

    ui_next: function(e) {
      e.preventDefault();

      var target = this.options.nextTarget;

      if (typeof target === 'string') {
        app.navigate(target, { trigger: true });
      } else if (typeof target === 'function') {
        target(this);
      }
    },

    ui_back: function(e) {
      e.preventDefault();

      var target = this.options.backTarget;

      if (typeof target === 'string') {
        app.navigate(target, { trigger: true });
      } else if (typeof target === 'function') {
        target(this);
      } else {
        app.pop(this.options.backEffects);
      }
    },

    onRender: function() {
      if (this.options.back === false) this.$('.back').hide();
      if (this.options.next === false) this.$('.next').hide();

      this.$('.back').addClass(this.options.backClass || 'button-prev');
      this.$('.next').addClass(this.options.nextClass || 'button-next');
    }
  });

  return module;
});