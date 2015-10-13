/*global describe, it*/
'use strict';
var utils = require('./../../lib/utils.js');
var expect = require('chai').expect;

describe('utils', function(){
  it('should exist', function(){
    expect(utils).to.be.an('object');
  });
  describe('.stripModuleDeclaration', function(){
    it('should exist', function(){
      expect(utils.stripModuleDeclaration).to.be.a('function');
    });
  });
  describe('.getIndent', function(){
    it('should exist', function(){
      expect(utils.getIndent).to.be.a('function');
    });
    it('should create correct indentation string', function(){
      expect(utils.getIndent(0)).to.equal('');
      expect(utils.getIndent(1)).to.equal(' ');
      expect(utils.getIndent(4)).to.equal('    ');
    });
  });
  describe('.getIndent', function(){
    it('should exist', function(){
      expect(utils.getIndent).to.be.a('function');
    });
  });
  describe('.indentText', function(){
    it('should exist', function(){
      expect(utils.indentText).to.be.a('function');
    });
    it('should add appropriate space', function(){
      var testString     = 'test, \nnewline';
      var expectedString = '    test, \n    newline';
      expect(utils.indentText(4, testString)).to.equal(expectedString);
    });
  });
  describe('.getResourceDisplayName', function(){
    it('should exist', function(){
      expect(utils.getResourceDisplayName).to.be.a('function');
    });
  });
  describe('.formatResourceDisplayName', function(){
    it('should exist', function(){
      expect(utils.formatResourceDisplayName).to.be.a('function');
    });
  });
  describe('.cleanSubMethodName', function(){
    it('should exist', function(){
      expect(utils.cleanSubMethodName).to.be.a('function');
    });
  });
  describe('.cleanDisplayName', function(){
    it('should exist', function(){
      expect(utils.cleanDisplayName).to.be.a('function');
    });
  });
  describe('.getUriParameterValue', function(){
    it('should exist', function(){
      expect(utils.getUriParameterValue).to.be.a('function');
    });
  });
  describe('.getResourceIdName', function(){
    it('should exist', function(){
      expect(utils.getResourceIdName).to.be.a('function');
    });
  });
});
