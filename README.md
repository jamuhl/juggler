# Visit the project website:

[jugglerjs.com](http://jugglerjs.com)

# What you get:

- Backbone, Backbone Marionette boilerplate
- Page Transition Handling (slide, fade, stack)
- Using require.js as module loader
- Integrated phonegap
- Ratchet CSS UI Components
- juggl as build tool (grunt.js)

# Getting started:

### Install juggler's command line tool:
    
    npm install -g juggl


### Create a new project:

    mkdir myapp
    cd myapp
    // init juggler project template
    juggl init:juggler
    // -> for now you will need to set path and projectname in grunt.js file
    
### Add a device:

    // create iOS phonegap application
    juggl iOS:create
    // build webapp
    juggl iOS:build
    // start iOS emulator (brew install ios-sim -- to use sim from commandline)
    juggl iOS:emulate
    
### Test / Debug App in Browser:

    // build debug app
    juggl iOS:boil
    // start built in server
    juggl server
    // -> head your browser to localhost:8000
