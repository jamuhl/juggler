define([
  'namespace',
  'underscore',
   './title',
   './segment',
   './tab'
],

function(ns, _, title, segment, tab) {
  var app = ns.app;

  // Create a new module
  var module = ns.module({ name: 'bars', append: true });

  _.extend(module.Views, title.Views);
  _.extend(module.Views, segment.Views);
  _.extend(module.Views, tab.Views);

  // add shortcut
  app.Bars = module.Views;

  // Required, return the module for AMD compliance
  return module;
});