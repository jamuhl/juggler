var path = require('path')
  , os = require('os');

/*
 * Task: phonegap
 * Description: PhoneGap CLI bridge
 * Dependencies: child_process
 */

module.exports = function(grunt) {
    var terminal = require("child_process").exec
      , isWin = os.platform === 'win32';

    function run(command, options, done) {
        terminal(command, options, function(error, stdout, stderr) {
            if (!error || error !== 'undefined') {
                grunt.log.writeln((command).cyan+" executed.");
            }else{
                grunt.fail.warn('failed to execute '+(command).red+'.');
                grunt.fail.warn((stderr).red);
            }
            done();
        });
    }

    grunt.registerMultiTask('iOS', 'PhoneGap CLI bridge', function() {
        var options = this.data || {};
        var command = options.command;

        if (!command) {
            var _path = options.path || 'ios',
            binfolder = options.folder || 'cordova',
            bin = options.bin || 'debug';
        
            command = path.normalize(path.join(_path, binfolder, bin));
            if (isWin) command += '.bat';
        }

        run(command, options.execOptions, this.async());
    });

    grunt.registerMultiTask('android', 'PhoneGap CLI bridge', function() {
        var options = this.data || {};
        var command = options.command;

        if (!command) {
            var _path = options.path || 'android',
                binfolder = options.folder || 'cordova',
                bin = options.bin || 'debug';

            command = path.normalize(path.join(_path, binfolder, bin));
            if (isWin) command += '.bat';
        }

        run(command, options.execOptions, this.async());
    });
};