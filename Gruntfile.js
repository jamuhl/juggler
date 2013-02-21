// This is the main application configuration file.  It is a Grunt
// configuration file, which you can learn more about here:
// https://github.com/cowboy/grunt/blob/master/docs/configuring.md
//
module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib');
  grunt.loadTasks('buildtasks');

  grunt.initConfig({

    clean: ['index.html', 'pages'],

    stylus: {
      'public/css/main.css': [
        'src/stylus/main.styl'//'client/stylus/**/*.styl'
      ]
    },

    jade: {
      compile: {
        options: { },
        files: [
          {'./index.html': [ 'src/jade/index.jade' ] },
          { expand: true, cwd: 'src/jade/pages/', src: ['**/*.jade'], dest: 'pages/', ext: '.html' }
        ]
      }
    },

    prettify: {
      './': [
        'index.html',
        'pages/**/*.html'
      ]
    },

    cssmin: {
      'public/css/index.css': [
        'public/css/bootstrap-2.3.0.css',
        'public/css/bootstrap-responsive-2.3.0.css',
        'public/css/font-awesome-3.0.css',
        'public/css/prettify.css',
        'public/css/main.css'
      ]
    },

    server: {
      host: '0.0.0.0',
      files: { 'favicon.ico': 'favicon.ico' },

      folders: {
          '/': './',
          'public': 'public',
          'pages': 'pages'
      }
    },

    watch: {
      jade: {
        files: 'src/jade/**/*.jade',
        tasks: 'default'
      },

      stylus: {
        files: 'src/stylus/**/*.styl',
        tasks: 'default'
      }
    }

  });

  grunt.registerTask('default', ['clean', 'jade', 'prettify', 'stylus', 'cssmin']);

};
