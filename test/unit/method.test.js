/*global describe, it*/
'use strict';
var methods = require('./../../lib/methods.js');
var expect = require('chai').expect;

describe('methods', function(){
  it('should exist', function(){
    expect(methods).to.be.an('object');
  });

  describe('.generateMethods', function(){
    it('should exist', function(){
      expect(methods.generateMethods).to.be.a('function');
    });
  });

  describe('.generateSubResource', function(){
    it('should exist', function(){
      expect(methods.generateSubResource).to.be.a('function');
    });
  });

  describe('.recursResources', function(){
    it('should exist', function(){
      expect(methods.recursResources).to.be.a('function');
    });
  });
  describe('.deconflictRamlResource', function(){
    it('should exist', function(){
      expect(methods.deconflictRamlResource).to.be.a('function');
    });
    it('should generate de-duplicated file', function(){
      var ramlResource = require('./../resources/exampleRamlResource.json');
      var deconflicedResource = methods.deconflictRamlResource(ramlResource);
      expect(deconflicedResource).to.be.ok;
    });
  });
});
