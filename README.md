grunt-spritesheet-generator
===========================

Highly inspired by [spritesmith](https://github.com/Ensighten/spritesmith), [node-spritesheet](https://github.com/richardbutler/node-spritesheet) and [grunt-spritesheet](https://github.com/nicholasstephan/grunt-spritesheet).

Create spritesheet and corresponding stylesheet for both retina and legacy screen pixelRatio.

Requirements
===========
This grunt task depends on [ImageMagick](http://www.imagemagick.org/).
You can install the app via various way, but I recommend to use Homebrew (`$ brew install ImageMagick`).

Installation
=========

Currently  not available via npm, so you have to manually add the repository in your `package.json`.

```package.json
"devDependencies": {
    "grunt-spritesheet-generator": "git://github.com/yshrsmz/grunt-spritesheet-generator#v0.4.0"
}
```  

__You should specify tag!__


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
            spIdentifier: '', //defaults to css filename without extension.
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

## 0.4.0
- rewrite everything. much cleaner now.

## 0.3.2
- make justResize optional. enable it from option.
- show warning message when source image's dimensions are odd.

## 0.3.1
- add justResize option so that legacy spritesheet can be converted from retina spritesheet

## 0.3.0
- change default template to use placeholder, instead of mixin.

## 0.2.1
- change version format. sry for inconvenience:(
- fix option name (layout -> layoutType

## 0.0.2
- add support for vertical/horizontal layout

## 0.0.1
- initial release
