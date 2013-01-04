// This is the main application configuration file.  It is a Grunt
// configuration file, which you can learn more about here:
// https://github.com/cowboy/grunt/blob/master/docs/configuring.md
//
module.exports = function(grunt) {

  // var version = '1.0.0';

  var phonegapLib = '/Development/phonegap_2.2.0/lib';


  grunt.loadNpmTasks('grunt-contrib');
  grunt.loadNpmTasks('grunt-contrib-jade');
  grunt.loadNpmTasks('grunt-shell');
  // grunt.loadNpmTasks('grunt-rigger');
  grunt.loadTasks("tasks");

  grunt.initConfig({

    meta: {
      location: __dirname,
      reverseDomain: 'com.example',
      projectName: 'boilerplate'
    },

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
    shell: {
      createIOS: {
        command: './ios/bin/create <%= meta.location %>/ios/ <%= meta.reverseDomain %>.<%= meta.projectName %> <%= meta.projectName %>',
        stdout: true,
        execOptions: {
            cwd: phonegapLib
        }
      },
      createAndroid: {
        command: './android/bin/create <%= meta.location %>/android/ <%= meta.reverseDomain %>.<%= meta.projectName %> <%= meta.projectName %>',
        stdout: true,
        execOptions: {
            cwd: phonegapLib
        }
      }
    },

    clean: {
      boiler: ['boiler/**/*'],
      iOS: ['ios/www/*'],              /* clean iOS webroot */
      android: ['android/assets/www/*' ]   /* clean android webroot */
    },

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
    },

    copy: {
      /* common client */
      boilClient: {
        options: { basePath: "src/client" },
        files: {
          "boiler/src/": ["src/client/**/*"]
        }
      },
      boilIOS: {
        options: { basePath: "src/iOS" },
        files: {
          "boiler/src/": ["src/iOS/**/*"]
        }
      },
      toDist: {
        options: { basePath: "boiler/src"},
        files: {
          "boiler/dist/": [
            "boiler/src/assets/font/**/*",
            "boiler/src/assets/img/**/*",
            "boiler/src/assets/js/libs/cordova-2.2.0.js"
        ]}
      },
      /* iOS */
      releaseToIOS: {
        options: { basePath: "bin/release" },
        files: {
          "ios/www/": ["bin/release/**/*"]
        }
      },
      specificToIOS: {
        options: { basePath: "src/specific/iOS" },
        files: {
          "ios/www/": ["src/specific/iOS/**/*"]
        }
      },
      /* Android */
      releaseToAndroid: {
        options: { basePath: "bin/release" },
        files: {
          "android/assets/www/": ["bin/release/**/*"]
        }
      },
      specificToAndroid: {
        options: { basePath: "src/specific/Android" },
        files: {
          "android/assets/www/": ["src/specific/android/**/*"]
        }
      }
    },

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

    jade: {
      compile: {
        options: {
          data: {
            debug: false
          }
        },
        files: {
          "boiler/src/assets/templates/*": ["boiler/src/app/modules/**/*.jade"]
        }
      }
    },
    stylus: {
      compile: {
        options: {
          // paths: ['path/to/import', 'another/to/import'],
          // urlfunc: 'embedurl', // use embedurl('test.png') in our code to trigger Data URI embedding
          // use: [
          //   require('fluidity') // use stylus plugin at compile time
          // ]
        },
        files: {
          "boiler/src/assets/css/main.css": [
            "boiler/src/stylus/main.styl"//"client/stylus/**/*.styl"
          ]}
      }
    },
    handlebars: {
      compile: {
        options: {
          processName: function(filename) {
            var pieces = filename.split("/");
            return pieces[pieces.length - 1].replace('.html', '');
          }
          //namespace: "JST"
        },
        files: {
          "boiler/gen/templates.js": [
            "boiler/src/assets/templates/*.html"
          ]
        }
      }
    },

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
    requirejs: {
      compile: {
        options: {
          //baseUrl: "path/to/base",
          mainConfigFile: "boiler/src/app/config.js",
          out: "boiler/gen/require.js",
          name: "config",
          wrap: false
        }
      }
    },

    concat: {
      "boiler/dist/assets/js/require.js": [
        "boiler/src/assets/js/libs/almond.js",
        "boiler/gen/templates.js",
        "boiler/gen/require.js"
      ]
    },

    mincss: {
      compress: {
        files: {
          "boiler/dist/assets/css/index.css": [
            "boiler/src/assets/css/bootstrap-2.0.2.css",
            "boiler/src/assets/css/bootstrap-responsive-2.0.2.css",
            "boiler/src/assets/css/font-awesome-2.0.css",
            "boiler/src/assets/css/chosen-0.9.8.css",
            "boiler/src/assets/css/main.css"
          ]
        }
      }
    }

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

  grunt.registerTask('iOS:boil', 'clean:boiler copy:boilClient copy:boilIOS stylus jade handlebars requirejs concat mincss copy:toDist');

  grunt.registerTask('iOS:build', 'clean:iOS copy:releaseToIOS copy:specificToIOS iOS:debug');


  grunt.registerTask('android:build', 'clean:android copy:releaseToAndroid copy:specificToAndroid android:debug');



  grunt.registerTask('build', 'iOS:build android:build');

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
