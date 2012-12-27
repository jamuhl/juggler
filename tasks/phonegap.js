/*
 * Task: phonegap
 * Description: PhoneGap CLI bridge
 * Dependencies: child_process
 */

module.exports = function(grunt) {
	var terminal = require("child_process").exec;

	function run(command, done) {
		terminal(command, function(error, stdout, stderr) {
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
		var options = this.data || {},
			path = options.path || 'ios/',
			binfolder = options.folder || 'cordova/',
			bin = options.bin || 'debug',
			command = path + binfolder + bin;

		run(command, this.async());
	});

	grunt.registerMultiTask('android', 'PhoneGap CLI bridge', function() {
		var options = this.data || {},
			path = options.path || 'android/',
			binfolder = options.folder || 'cordova/',
			bin = options.bin || 'debug',
			command = path + binfolder + bin;

		run(command, this.async());
	});
};