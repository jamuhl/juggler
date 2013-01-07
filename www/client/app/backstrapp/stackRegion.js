define([
    'underscore',  
    'backbone',
    'marionette',
    './stackNavigator'
],

function(_, Backbone, Marionette, StackNavigator) {

    var Region = Backbone.Marionette.Region.extend({

        initialize: function(options) {
            this.stackNavigator = new StackNavigator({
                el: this.el,
                css: options.css || {}
            });
        },

        push: function(view) {
            // this.$el.hide();
            // this.$el.html(view.el);
            // this.$el.slideDown("fast");
            this.stackNavigator.pushView(view);
        },

        pop: function() {
            this.stackNavigator.popView();
        }
    });

    return Region;

});