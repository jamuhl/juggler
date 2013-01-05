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
                el: this.el
            });
        },

        open: function(view) {
            // this.$el.hide();
            // this.$el.html(view.el);
            // this.$el.slideDown("fast");
            this.stackNavigator.pushView(view);
        },

        back: function() {
            this.stackNavigator.popView();
        }
    });

    return Region;

});