grunt-spritesheet-generator
===========================

Highly inspired by [node-spritesheet](https://github.com/richardbutler/node-spritesheet) and [grunt-spritesheet](https://nicholasstephan/grunt-spritesheet).



Requirements
===========
This grunt task depends on [ImageMagick](http://www.imagemagick.org/).
You can install the app via various way, but I recommend to use Homebrew (`$ brew install ImageMagick`).

Installation
=========

Currently  not available via npm, so you have to manually add the repository in your `package.json`.


Example
=======

```Gruntfile.js

// Add to your grunt config
spritegen: {
    options: {
        downsampling: 'LanczosSharp'
    }
    mypage: {
        options: {
            // output file path
            outputCss: 'css/mypage_sprite.css'

            // actual path written in output css file.
            httpImagePath: 'http://www.foobar.com/images/mypage/sprite.png',

            layoutType: 'default', // default, vertical, horizontal.
            output: {
                legacy: {
                    pixelRatio: 1,
                    outputImage: 'images/sprite.png'
                },
                retina: {
                    pixelRatio: 2,
                    outputImage: 'images/sprite@2x.png'
                }
            }
        },
        files: {
            // key: base path for all output files.
            // value: image file directory
            'assets': 'images/mypage/sprite/*'
        }
    }
}

// import task
grunt.loadNpmTasks('grunt-spritesheet-generator');

```

Version History
===============

## 0.0.2
- add support for vertical/horizontal layout

## 0.0.1
- initial release
