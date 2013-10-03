module.exports = function(grunt) {

    grunt.initConfig({
        coffee: {
            dist: {
                expand: true,
                cwd: 'src',
                src: ['*.coffee'],
                dest: 'lib',
                ext: '.js',
                options: {
                    bare: true
                }
            }
        },
        clean: {
            client: {
                src: ['lib']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-coffee');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('default', ['clean', 'coffee']);
};