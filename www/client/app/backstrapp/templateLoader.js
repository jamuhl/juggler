define([
  // Libs
  "jquery",
  "underscore",
  "handlebars"
],

function($, _, Handlebars) {
  // Put application wide code here

  //var tmp = 0;

  return {
    // This is useful when developing if you don't want to use a
    // build process every time you change a template.
    //
    // Delete if you are using a different template loading method.
    fetchTemplate: function(path) {
      var JST = window.JST = window.JST || {}
        , loadUrl;
      //var def = new $.Deferred();

      // Should be an instant synchronous way of getting the template, if it
      // exists in the JST object.
      if (JST[path]) {
        return JST[path];
        // if (_.isFunction(done)) {
        //     return tmpl;
        // }

        //return def.resolve(tmpl);
      }
      else {
        loadUrl = 'assets/templates/' + path + '.html';
      }

      // Fetch it asynchronously if not available from JST, ensure that
      // template requests are never cached and prevent global ajax event
      // handlers from firing.
      var loadedTmpl;
      $.ajax({
        url: loadUrl,
        type: "get",
        dataType: "text",
        cache: false,
        global: false,
        async: false,

        success: function(contents) {
          JST[path] = contents;

          // Set the global JST cache and return the template
          loadedTmpl = contents;
        }
      });

      // Ensure a normalized return value (Promise)
      return loadedTmpl;
    }
  };
});