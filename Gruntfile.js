module.exports = function(grunt) {

    grunt.initConfig({
        jshint: {
            options: {
                node: true,
                nomen: false
            },
            task: {
                src: [
                    'tasks/**/*.js'
                ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('default', ['jshint']);
};