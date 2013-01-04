/**
 * Created by Piotr Walczyszyn (outof.me | @pwalczyszyn)
 *
 * User: pwalczys
 * Date: 2/16/12
 * Time: 9:53 AM
 */

define(['jquery', 'underscore', 'Backbone', 'views/next/NextView', 'text!views/home/HomeView.tpl'],
    function ($, _, Backbone, NextView, HomeViewTemplate) {
        var HomeView = Backbone.View.extend({

            events:{
                'click #btnNextView':'btnNextView_clickHandler'
            },

            render:function () {
                this.$el.html(_.template(HomeViewTemplate));
                return this;
            },

            btnNextView_clickHandler:function (event) {
                $.mobile.jqmNavigator.pushView(new NextView);
            }

        });
        return HomeView;
    });