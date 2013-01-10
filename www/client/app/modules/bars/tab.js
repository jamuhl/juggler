define([
    'backbone',
    'namespace'
],

function(Backbone, ns) {
	var app = ns.app;

    // Create a new module
    var module = ns.module();

    module.Views.TabItem = ns.ItemView.extend({
        tagName: 'li',
        template: 'bars/tabItem',
        className: 'tab-item',

        allowAutoStackPositioning: true,

        initialize: function(options) {
        },

        events: {
            'click .target': 'ui_target'
        },

        ui_target: function(e) {
            e.preventDefault();

            Backbone.history.navigate(this.model.get('target'), { trigger: true });
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

        initialize: function(options) {
            options = options || {};
            this.collection = this.collection || new ns.Collection(options);
        }
    });

    return module;
});