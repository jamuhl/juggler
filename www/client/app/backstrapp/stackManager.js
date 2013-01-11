define([
  'backbone',
  'underscore',
  './stackEffects'
],

function(Backbone, _, effects) {

  var stack = {

    init: function(ns) {
      var self = this;

      this.ns = ns;
      this.app = ns.app;

      this.app.stack = this;
      this.app.stack.effects = effects;

      this.app.push = function(container) { self.push(container); };
      this.app.pop = function(container) { self.pop(container); };
    },

    stackRegions: [],
    viewStack: [],

    addStackRegion: function(name, selector, options) {
      options = options || {};
      options.el = selector;
      options.name = name;

      this.app[name] = new this.ns.StackRegion(options);
      this.stackRegions.push(name);
    },

    push: function(container) {
      var self = this
        , toHide = this.viewStack[this.viewStack.length -1] || { views: {} };

      container.effects = container.effects || {};
      container.fragment = Backbone.history.fragment;

      // push views
      _.each(container.views, function(value, key, index) {
        if (value !== 'keep' && self.app[key] && self.app[key].push) self.app[key].push(value, container.effects[key] || value.pushEffect);
      });

      var hide = _.difference(this.stackRegions, _.keys(container.views));
      _.each(hide, function(key) {
        var prevEffect = toHide.views[key] && toHide.views[key].popEffect
          , effect = container.effects[key] || prevEffect || null; // todo defaults per region
        if (self.app[key] && self.app[key].hide) self.app[key].hide(effect && effect.reverse);
      });

      this.viewStack.push(container);

    },

    pop: function(container) {
      var self = this
        , toPop = this.viewStack[this.viewStack.length -1]
        , toShow = this.viewStack[this.viewStack.length -2] || { views: {} };

      // if we have no target to show go back to root
      if (this.viewStack.length === 1) {
        Backbone.history.navigate('', { trigger: true });
        return;
      }

      container = container || {};
      _.defaults(container, this.viewStack.pop());
      container.effects = container.effects || {};

      Backbone.history.navigate(toShow.fragment || '', { trigger: false });



      // pop views
      _.each(container.views, function(value, key, index) {
        var effect = container.effects[key] || value.popEffect || {};
        if (value !== 'keep' && self.app[key] && self.app[key].pop) self.app[key].pop(value, (effect && effect.reverse));
      });

      var hide = _.difference(_.keys(toPop.views), _.keys(toShow.views));
      _.each(hide, function(key) {
        var effect = container.effects[key] || toPop.views[key].popEffect || null; // todo defaults per region
        if (toShow.views[key] !== 'keep' && self.app[key] && self.app[key].hide) self.app[key].hide(effect && effect.reverse);
      });

      var show = _.keys(toShow.views);
      _.each(show, function(key) {
        var effect = container.effects[key] || toShow.views[key].pushEffect || null; // todo defaults per region
        if (self.app[key] && self.app[key].show) self.app[key].show(effect);
      });
    }

  };

  return stack;

});