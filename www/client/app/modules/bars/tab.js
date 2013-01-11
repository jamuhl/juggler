define([
  'namespace'
],

function(ns) {
  var app = ns.app;

  // Create a new module
  var module = ns.module();

  module.Views.TabItem = ns.ItemView.extend({
    tagName: 'li',
    template: 'bars/tabItem',
    className: 'tab-item',

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
      this.$('.icon').addClass(this.model.get('iconClass'));
    }
  });

  module.Views.Tab = ns.CollectionView.extend({
    tagName: 'ul',
    className: 'tab-inner',
    itemView: module.Views.TabItem,
    pushCSS: { display: '', 'box-sizing': 'border-box' },

    allowAutoStackPositioning: true,

    initialize: function(options) {
      options = options || {};
      this.collection = this.collection || new ns.Collection(options);
    }
  });

  return module;
});