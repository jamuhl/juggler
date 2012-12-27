// This is the main application configuration file.  It is a Grunt
// configuration file, which you can learn more about here:
// https://github.com/cowboy/grunt/blob/master/docs/configuring.md
//
module.exports = function(grunt) {

  // var version = '1.0.0';


  // grunt.loadNpmTasks('grunt-contrib');
  // grunt.loadNpmTasks('grunt-rigger');
  grunt.loadTasks("tasks");

  grunt.initConfig({

    // meta: {
    //   version: version,
    //   banner: '// lebdo.ch, v<%= meta.version %>\n' +
    //     '// Copyright (c)<%= grunt.template.today("yyyy") %> inweso GmbH.\n',
    //   bannerCSS: '/*! ' +
    //     ' * \n' +
    //     ' * lebdo.ch, v<%= meta.version %>\n' +
    //     ' * Copyright (c)<%= grunt.template.today("yyyy") %> inweso GmbH.\n' + 
    //     ' */',
    //   handlebars: {
    //     trimPath: true,
    //     basePath: 'client/assets/templates/',
    //     extension: '.html'
    //   }
    // },

    /* phonegap cli bridge - iOS */
    iOS: {
      emulate: {
        bin: 'emulate'
      },
      debug: {
        bin: 'debug'
      },
      log: {
        bin: 'log'
      }
    },

    /* phonegap cli bridge - Android */
    android: {
      emulate: {
        bin: 'emulate'
      },
      debug: {
        bin: 'debug'
      },
      log: {
        bin: 'log'
      }
    }

    // rig: {
    //   lebdoCSS: {
    //     src: [
    //       'client/assets/css/bootstrap-2.2.0.css',
    //       'client/assets/css/bootstrap-responsive-2.2.0.css',
    //       'client/assets/css/bootstrap-notify-1.0.css',
    //       'client/assets/css/bootstrap-toggle-buttons.2.7.css',
    //       'client/assets/css/font-awesome-2.0.css',
    //       'client/assets/css/address-autocomplete.css',
    //       'client/assets/css/chosen-0.9.8.css',
    //       'client/assets/css/add2home-2.0.4.css',
    //       '<banner:meta.bannerCSS>', 
    //       'client/assets/css/main.css'
    //     ],
    //     dest: 'client/dist/debug/lebdo-' + version + '.css'
    //   },
    //   lebdoJS: {
    //     src: [
    //       '<banner:meta.banner>', 
    //       'client/assets/js/libs/require.js',
    //       'client/dist/debug/templates.js',
    //       'client/dist/debug/require.js'
    //     ],
    //     dest: 'client/dist/debug/lebdo-' + version + '.js'
    //   },
    //   lebdoPublicJS: {
    //     src: [
    //       '<banner:meta.banner>', 
    //       'client/assets/js/libs/jquery-1.8.2.min.js',
    //       'client/assets/js/libs/bootstrap-2.2.0.js',
    //       'client/assets/js/libs/faq.js',
    //       'client/assets/js/libs/i18next-1.5.8.js'
    //     ],
    //     dest: 'client/dist/debug/lebdo-public-' + version + '.js'
    //   }
    //   /*,
    //   amd: {
    //     src: ['<banner:meta.banner>', 'src/amd.js'],
    //     dest: 'bin/i18next.amd-latest.js'
    //   },
    //   amdjquery: {
    //     src: ['<banner:meta.banner>', 'src/amd.jquery.js'],
    //     dest: 'bin/i18next.amd.withJQuery-latest.js'
    //   },
    //   spec: {
    //     src: ['spec/spec.js'],
    //     dest: 'test/test.js'
    //   }*/
    // },

    // // The clean task ensures all files are removed from the dist/ directory so
    // // that no files linger from previous builds.
    // clean: ["client/dist/", "client/assets/templates"],

    // // The lint task will run the build configuration and the application
    // // JavaScript through JSHint and report any errors.  You can change the
    // // options for this task, by reading this:
    // // https://github.com/cowboy/grunt/blob/master/docs/task_lint.md
    // lint: {
    //   files: [
    //     /*"build/config.js", */"client/app/**/*.js"
    //   ]
    // },

    // // The jshint option for scripturl is set to lax, because the anchor
    // // override inside main.js needs to test for them so as to not accidentally
    // // route.
    // jshint: {
    //   options: {
    //     scripturl: true,
    //     laxcomma: true,
    //     loopfunc: true
    //   }
    // },

    // // The jst task compiles all application templates into JavaScript
    // // functions with the underscore.js template function from 1.2.4.  You can
    // // change the namespace and the template options, by reading this:
    // // https://github.com/tbranyen/build-tasks/tree/master/jst
    // //
    // // The concat task depends on this file to exist, so if you decide to
    // // remove this, ensure concat is updated accordingly.

    // // jst: {
    // //   "dist/debug/templates.js": [
    // //     "app/templates/**/*.html"
    // //   ]
    // // },

    // stylus: {
    //   "client/assets/css/main.css": [
    //     "client/stylus/main.styl"//"client/stylus/**/*.styl"
    //   ]
    // },

    // jade: {
    //   "client/assets/templates": [
    //     "client/app/modules/**/*.jade"
    //   ],
    //   "client/assets/templates/admin": [
    //     "client/app/admin/**/*.jade"
    //   ]
    // },

    // handlebars: {
    //   "client/dist/debug/templates.js": [
    //     "client/assets/templates/*.html"
    //   ]
    // },

    // // The concatenate task is used here to merge the almond require/define
    // // shim and the templates into the application code.  It's named
    // // dist/debug/require.js, because we want to only load one script file in
    // // index.html.
    // // concat: {
    // //   "client/dist/debug/require.js": [
    // //     "client/assets/js/libs/require.js",
    // //     "client/dist/debug/templates.js",
    // //     "client/dist/debug/require.js"
    // //   ]
    // // },

    // // This task uses the MinCSS Node.js project to take all your CSS files in
    // // order and concatenate them into a single CSS file named index.css.  It
    // // also minifies all the CSS as well.  This is named index.css, because we
    // // only want to load one stylesheet in index.html.
    // // mincss: {
    // //   "client/dist/release/index.css": [
    // //     "client/assets/css/bootstrap-2.2.0.css",
    // //     "client/assets/css/bootstrap-responsive-2.2.0.css",
    // //     "client/assets/css/bootstrap-notify-1.0.css",
    // //     "client/assets/css/bootstrap-toggle-buttons.2.7.css",
    // //     "client/assets/css/font-awesome-2.0.css",
    // //     "client/assets/css/address-autocomplete.css",
    // //     /*"client/assets/css/themes/base/jquery.ui.core.css",
    // //     "client/assets/css/themes/base/jquery.ui.resizable.css",
    // //     "client/assets/css/themes/base/jquery.ui.selectable.css",
    // //     "client/assets/css/themes/base/jquery.ui.accordion.css",
    // //     "client/assets/css/themes/base/jquery.ui.autocomplete.css",
    // //     "client/assets/css/themes/base/jquery.ui.button.css",
    // //     "client/assets/css/themes/base/jquery.ui.dialog.css",
    // //     "client/assets/css/themes/base/jquery.ui.slider.css",
    // //     "client/assets/css/themes/base/jquery.ui.tabs.css",
    // //     "client/assets/css/themes/base/jquery.ui.datepicker.css",
    // //     "client/assets/css/themes/base/jquery.ui.progressbar.css",
    // //     "client/assets/css/themes/base/jquery.ui.theme.css",*/
    // //     "client/assets/css/chosen-0.9.8.css",
    // //     "client/assets/css/main.css"
    // //   ]
    // // },

    // mincss: {
    //   dist: {
    //     dest: "client/dist/release/lebdo-<%= meta.version %>.css",
    //     src: [ /*"<banner:meta.bannerCSS>",*/ "client/dist/debug/lebdo-" + version + ".css" ]
    //   }
    // },

    // // Takes the built require.js file and minifies it for filesize benefits.
    // min: {
    //   dist: {
    //     dest: "client/dist/release/lebdo-<%= meta.version %>.js",
    //     src: [ "<banner:meta.banner>", "client/dist/debug/lebdo-" + version + ".js" ]
    //   },
    //   dist_public: {
    //     dest: "client/dist/release/lebdo-public-<%= meta.version %>.js",
    //     src: [ "<banner:meta.banner>", "client/dist/debug/lebdo-public-" + version + ".js" ]
    //   }
    // },

    // // Running the server without specifying an action will run the defaults,
    // // port: 8080 and host: 127.0.0.1.  If you would like to change these
    // // defaults, simply add in the properties `port` and `host` respectively.
    // //
    // // Changing the defaults might look something like this:
    // //
    // // server: {
    // //   host: "127.0.0.1", port: 9001
    // //   debug: { ... can set host and port here too ...
    // //  }
    // //
    // //  To learn more about using the server task, please refer to the code
    // //  until documentation has been written.
    // server: {
    //   files: { "favicon.ico": "client/favicon.ico" },

    //   folders: {
    //       "app/templates": "client/assets/templates"
    //   },

    //   debug: {
    //     files: { "favicon.ico": "client/favicon.ico" },

    //     folders: {
    //       "app": "client/dist/debug",
    //       "assets/js/libs": "client/dist/debug"
    //     }
    //   },

    //   release: {
    //     // These two options make it easier for deploying, by using whatever
    //     // PORT is available in the environment and defaulting to any IP.
    //     host: "0.0.0.0",
    //     port: process.env.PORT || 8000,

    //     files: { "favicon.ico": "client/favicon.ico" },

    //     folders: {
    //       "app": "client/dist/release",
    //       "assets/js/libs": "client/dist/release",
    //       "assets/css": "client/dist/release"
    //     }
    //   }
    // },

    // // This task uses James Burke's excellent r.js AMD build tool.  In the
    // // future other builders may be contributed as drop-in alternatives.
    // requirejs: {
    //   // Include the main configuration file
    //   mainConfigFile: "client/app/config.js",

    //   // Output file
    //   out: "client/dist/debug/require.js",

    //   excludeShallow: [
    //       "admin/adminViews"
    //     //, "modules/common/personProfile"
    //   ],

    //   // Root application module
    //   name: "config",

    //   // Do not wrap everything in an IIFE
    //   wrap: false
    // },

    // copy: {
    //   js: {
    //     options: { basePath: "client/assets/js/libs" },
    //     files: {
    //       "client/dist/release/": ["client/assets/js/libs/raphael.js", "client/assets/js/libs/infoviz.js"]
    //     }
    //   },
    //   css: {
    //     options: { basePath: "client/assets/css" },
    //     files: {
    //       "client/dist/release/": ["client/assets/css/font-awesome-ie7-2.0.css"]
    //     }
    //   }
    // },

    // watch: {
    //   jade: {
    //     files: "client/**/*.jade",
    //     tasks: "jade"
    //   },

    //   stylus: {
    //     files: "client/stylus/**/*.styl",
    //     tasks: "stylus"
    //   }
    // }

  });

  // // The default task will remove all contents inside the dist/ folder, lint
  // // all your code, precompile all the underscore templates into
  // // dist/debug/templates.js, compile all the application code into
  // // dist/debug/require.js, and then concatenate the require/define shim
  // // almond.js and dist/debug/templates.js into the require.js file.
  // grunt.registerTask("default", "clean lint jade stylus");

  // // The debug task is simply an alias to default to remain consistent with
  // // debug/release.
  // grunt.registerTask("debug", "default");

  // // The release task will run the debug tasks and then minify the
  // // dist/debug/require.js file and CSS files.
  // grunt.registerTask("release", "default handlebars requirejs rig min mincss copy");

};
