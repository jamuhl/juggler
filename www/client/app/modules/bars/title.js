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

        initialize: function(options) {
            options = options || {};
            this.model = this.model || new ns.Model({
                title: options.title,
                back: options.back || 'back',
                next: options.next || 'next'
            });
        },

        events: {
            'click .back': 'ui_back'
        },

        ui_back: function(e) {
            e.preventDefault();

            app.pop(this.options.backEffects);
        },

        onRender: function() {
            if (this.options.back === false) this.$('.back').hide();
            if (this.options.next === false) this.$('.next').hide();

            this.$('.back').addClass(this.options.backClass || 'button-prev');
            this.$('.next').addClass(this.options.nextClass || 'booton-next');
        }
    });

    return module;
});