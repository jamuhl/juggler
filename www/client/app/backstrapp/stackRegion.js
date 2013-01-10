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

            this.$el = $(this.el);
            this.$el.addClass('hidden');
            this.isHidden = true;
        },

        push: function(view, transition) {
            // this.$el.hide();
            // this.$el.html(view.el);
            // this.$el.slideDown("fast");
            if (this.isHidden) this.show();
            this.stackNavigator.pushView(view, transition);
        },

        pop: function(transition) {
            if (this.isHidden) this.show();
            this.stackNavigator.popView(transition);
        },

        show: function(transition) {
            if (transition) {
                transition.play(null, this, function() { this.$el.show(); }, this);
            } else {
                this.$el.show();
            }
            this.$el.removeClass('hidden');
            this.isHidden = false;
        },

        hide: function(transition) {
            if (transition) {
                transition.play(this, null, function() { this.$el.hide(); }, this);
            } else {
                this.$el.hide();
            }
            this.$el.addClass('hidden');
            this.isHidden = true;
        }
    });

    return Region;

});