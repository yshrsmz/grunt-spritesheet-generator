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
        ,spritegen : {
            options: {
                downsampling: 'LanczosSharp'
            },
            vertical: {
                options: {
                    outputCss: 'example/output/css/vertical.css',
                    httpImagePath: 'http://www.foobar.com/images/vertical.png',
                    layoutType: 'default',
                    output: {
                        legacy: {
                            pixelRatio: 1,
                            outputImage: 'example/output/images/vertical.png'
                        },
                        retina: {
                            pixelRatio: 2,
                            outputImage: 'example/output/images/vertical@2x.png'
                        }
                    }
                },
                files: {
                    '.': 'example/src/img/flags-2x/*'
                }
            },
            horizontal: {
                options: {
                    outputCss: 'example/output/css/horizontal.css',
                    httpImagePath: 'http://www.foobar.com/images/horizontal.png',
                    layoutType: 'horizontal',
                    output: {
                        legacy: {
                            pixelRatio: 1,
                            outputImage: 'example/output/images/horizontal.png'
                        },
                        retina: {
                            pixelRatio: 2,
                            outputImage: 'example/output/images/horizontal@2x.png'
                        }
                    }
                },
                files: {
                    '.': 'example/src/img/flags-2x/*'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadTasks('tasks');

    grunt.registerTask('default', ['jshint']);
};