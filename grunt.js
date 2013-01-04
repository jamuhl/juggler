// This is the main application configuration file.  It is a Grunt
// configuration file, which you can learn more about here:
// https://github.com/cowboy/grunt/blob/master/docs/configuring.md
//
module.exports = function(grunt) {

  // Needed vars to start
  var phonegapLib = '/Development/phonegap_2.2.0/lib'
    , reverseDomain = 'com.example'
    , projectName = 'boilerplate';

  // import tasks
  grunt.loadNpmTasks('grunt-contrib');
  grunt.loadNpmTasks('grunt-contrib-jade'); /* as long default jade won't allow wildcard for target files */
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadTasks("tasks");

  grunt.initConfig({

    meta: {
      location: __dirname,
      reverseDomain: reverseDomain,
      projectName: projectName
    },

    shell: {
      /* create phonegap projects */
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
      /* specific iOS */
      boilIOS: {
        options: { basePath: "src/iOS" },
        files: {
          "boiler/src/": ["src/iOS/**/*"]
        }
      },

      /* copy assets to dist */
      toDist: {
        options: { basePath: "boiler/src"},
        files: {
          "boiler/dist/": [
            "boiler/src/assets/font/**/*",
            "boiler/src/assets/img/**/*",
            "boiler/src/assets/js/libs/cordova-2.2.0.js"
        ]}
      },

      /* releaseiOS */
      releaseToIOS: {
        options: { basePath: "boiler/dist" },
        files: {
          "ios/www/": ["boiler/dist/**/*"]
        }
      }




      // specificToIOS: {
      //   options: { basePath: "src/specific/iOS" },
      //   files: {
      //     "ios/www/": ["src/specific/iOS/**/*"]
      //   }
      // },
      // /* Android */
      // releaseToAndroid: {
      //   options: { basePath: "bin/release" },
      //   files: {
      //     "android/assets/www/": ["bin/release/**/*"]
      //   }
      // },
      // specificToAndroid: {
      //   options: { basePath: "src/specific/Android" },
      //   files: {
      //     "android/assets/www/": ["src/specific/android/**/*"]
      //   }
      // }
    },

    /* build the webproject 
    * Templates: jade -> handlebars -> JST
    * Stylesheet: stylus -> mincss -> one css
    * Javascript: app -> requirejs -> concat -> one js
    */
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
    // }

  });

  grunt.registerTask('iOS:init', 'shell:createIOS');
  grunt.registerTask('iOS:boil', 'clean:boiler copy:boilClient copy:boilIOS stylus jade handlebars requirejs concat mincss copy:toDist');

  // grunt.registerTask('iOS:build', 'clean:iOS copy:releaseToIOS copy:specificToIOS iOS:debug');


  // grunt.registerTask('android:build', 'clean:android copy:releaseToAndroid copy:specificToAndroid android:debug');



  // grunt.registerTask('build', 'iOS:build android:build');

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
