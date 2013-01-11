define([
  'namespace'
],

function(ns) {
  var app = ns.app;

  // Create a new module
  var module = ns.module();

  module.Views.Segment = ns.ItemView.extend({
    tagName: 'div',
    template: 'bars/segment',

    allowAutoStackPositioning: true,

    pushCSS: (function() {
      var css = {};
      css.display = app.vendorPrefixCSS + 'box';
      css[app.vendorPrefixCSS + 'box-orient'] = 'horizontal';
      css['box-sizing'] = 'border-box';
      css[app.vendorPrefixCSS + 'box-flex'] = '1';
      return css;
    })(),

    initialize: function(options) {
      options = options || {};
      this.model = this.model || new ns.Model({
        segments: options.segments,
        back: options.back || 'back',
        next: options.next || 'next'
      });

      if (options.inHeader) {
        this.options.back = false;
        this.options.next = false;

        var css = {};
        css['box-sizing'] = 'border-box';
        this.pushCSS = css;
      }
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

      this.$('.back').addClass(this.options.backClass || 'button');
      this.$('.next').addClass(this.options.nextClass || 'button');

      var segments = new Segments(this.options.segments);
      segments.render();
      this.$('.segmented-controller').html(segments.$el.html());
    }
  });

  var SegmentItem = ns.ItemView.extend({
    tagName: 'li',
    template: 'bars/segmentItem',

    initialize: function(options) {
    },

    events: {
      'click .target': 'ui_target'
    },

    ui_target: function(e) {
      e.preventDefault();

      var target = this.model.get('target');

      if (typeof target === 'string') {
        app.navigate(target, { trigger: true });
      } else if (typeof target === 'function') {
        target(this);
      }
    },

    onRender: function() {
      if (this.model.get('active')) this.$el.addClass('active');
    }
  });

  var Segments = ns.CollectionView.extend({
    tagName: 'ul',
    className: 'segmented-controller',
    itemView: SegmentItem,

    initialize: function(options) {
      options = options || {};
      this.collection = this.collection || new ns.Collection(options);
    }
  });

  return module;
});