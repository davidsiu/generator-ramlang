var path = require('path');
var _ = require('lodash');
var endOfLine = require('os').EOL;
var util = require('util');

var generatorUtil = require('./utils');
var documentation = require('./documentation');

var methodTemplatePath = path.resolve(__dirname, '../templates', 'method.js');
var subResourceTemplatePath = path.resolve(__dirname, '../templates', 'sub-resource.js');
var methodTemplateText = null;
var subResourceTemplateText = null;
var indentAmount = 2;
var mediaTypeExtension = null;
var providerName;

module.exports = {};

/**
 * Returns the api function parameters for the provided HTTP verb
 *
 * @param {object} ramlResource - The RAML Resource object.
 * @param {string} method - The HTTP verb
 * @param {string} relativeUri - The uri to set as the first parameter.
 * @returns {Object}
 */
var getParametersForMethod = module.exports.getParametersForMethod = function(ramlResource, method, relativeUri) {
  var result = {
    method: '',
    api: '',
    rawMethod: [],
    rawApi: []
  };

  var getArgName = generatorUtil.getArgumentName;
  // Starts with either {id} or {<resource>Id} (e.g., {accountId})
  var startsWithIdParam = generatorUtil.startsWithIdParam;

  var uriParams       = ramlResource.uriParameters;
  var segments        = relativeUri.split('/');
  var uriSegments     = [];
  var apiParams       = [];
  var params          = [];
  var manuallyResolve = {};

  // exclude the first and last 2 entries
  segments = segments.splice(1, segments.length);

  segments.forEach(function(segment, index) {

    _.forEach(uriParams, function(paramValue, paramName) {
      if (paramValue.required === true || paramValue.required == 'true') {
        var macro = util.format('{%s}', paramName);
        var regex = new RegExp(macro, 'ig');
        var val;

        if (paramName.toLowerCase() == 'mediatypeextension') {
          val = mediaTypeExtension;
        } else {
          val = generatorUtil.getUriParameterValue(paramValue);
        }

        if (!_.isEmpty(val)) {
          segment = segment.replace(regex, val);
        }
        // Ignore the 'id' or '<resource>Id' uri param because we handle it later on.
        else if (!/^[a-z]*[Ii]d$/.test(paramName)) {
          manuallyResolve[paramName] = regex;
        }
      }
    });

    if (startsWithIdParam(segment)) {
      if (index != segments.length - 1) {
        var arg = getArgName(segments[index - 1], 0, 'Id', params);
        params.push(arg);
        segment = '\' + ' + arg + ' + \'';
      } else {
        // Return because we don't need to add {id} to the uri.
        return;
      }
    }

    uriSegments.push(segment);
  });

  var apiUri = '\'/' + uriSegments.join('/') + '\'';

  // Resolve any left over bindings by adding a param to the api function
  // This can happen when we can't find a value for a uri parameters.
  if (!_.isEmpty(manuallyResolve)) {
    _.forEach(manuallyResolve, function(regex, name) {
      var arg = getArgName(name, 0, '', params);
      params.push(arg);
      apiUri = apiUri.replace(regex, '\' + ' + arg + ' + \'');
    });
  }

  apiParams.push(apiUri);

  // Get either 'id' or '<resource>Id'
  var resourceId = generatorUtil.getResourceIdName(relativeUri);

  // Add additional parameters
  switch (method) {
    case 'query':
      params.push('query');
      apiParams.push('null', 'query');
      break;
    case 'get':
      params.push(resourceId);
      apiParams.push(resourceId);
      break;
    case 'post':
      params.push('entity');
      apiParams.push('entity');
      break;
    case 'patch':
      params.push('entity');
      apiParams.push('entity.' + resourceId, 'entity');
      break;
    case 'put':
      params.push('entity');
      apiParams.push('entity.' + resourceId, 'entity');
      break;
    case 'delete':
      params.push(resourceId);
      apiParams.push(resourceId);
      break;
  }

  result.rawMethod = params;
  result.rawApi = apiParams;
  result.method = params.join(', ');
  result.api = apiParams.join(', ');

  return result;
};

/**
 * Determines if the RAML resource is a collection resource. This is done by checking the type of the resource.
 * If the resource is defined as a schema object then it will look (lower case comparison) for a property which
 * contains the word 'collection'.
 *
 * @param {Object} ramlResource - The RAML resource to check
 */
var isCollection = module.exports.isCollection = function(ramlResource) {
  // Get either 'id' or '<resource>Id'
  var resourceId = generatorUtil.getResourceIdName(ramlResource.relativeUri);
  return (!_.isEmpty(ramlResource) &&
             (_.isEmpty(ramlResource.uriParameters) ||
              _.isUndefined(ramlResource.uriParameters[resourceId]))) ||
          !/^\/{[a-z]*id}/ig.test(ramlResource.relativeUri);
};

/**
 * A helper method for generating RAML resource methods. eg. GET, POST, PUT and DELETE
 *
 * @param {Object} ramlResource - The RAML resource object to generate the methods for
 * @param {string} relativeUri - The uri of the resource
 * @returns {string} The compiled template string
 */
var generateMethods = module.exports.generateMethods = function(ramlResource, relativeUri) {
  var isCol = isCollection(ramlResource);
  var methodData = [];

  (ramlResource.methods || []).forEach(function(item, index) {
    var transformedMethodName = isCol && item.method == 'get' ? 'query' : item.method;
    var parameters = getParametersForMethod(ramlResource, transformedMethodName, relativeUri);
    methodData.push({
      description: documentation.formatDescription(item.description, true),
      factoryMethodName: generatorUtil.toCamelCase(item.displayName || transformedMethodName),
      apiMethodName: item.method,
      apiProviderName: providerName,
      queryParameters: parameters.method,
      apiQueryParameters: parameters.api,
      separator: index != ramlResource.methods.length - 1 ? ',' : ''
    });
  });

  var compiledMethod = _.template(methodTemplateText, {
    methods: methodData
  });

  return generatorUtil.indentText(indentAmount, compiledMethod);
};

/**
 * A helper method for generating a resource within a resource.
 *
 * Note: Will not render a sub method if the name or list of methods is empty.
 *
 * @param ramlResource - The RAML resource to generate the sub resource for
 * @param relativeUri The relative uri of the resource
 * @returns {string} The compiled sub resource
 */
var generateSubResource = module.exports.generateSubResource = function(ramlResource, relativeUri) {
  var subMethodName = generatorUtil.cleanSubMethodName(ramlResource.relativeUri);
  var hasMethods    = (ramlResource.methods || []).length !== 0;

  if (subMethodName && hasMethods) {
    return _.template(subResourceTemplateText, {
      resource: {
        name: generatorUtil.cleanSubMethodName(ramlResource.relativeUri),
        description: documentation.formatDescription(ramlResource.description, true),
        methods: generateMethods(ramlResource, relativeUri)
      }
    });
  }

  if (!subMethodName) {
    console.log('Failed to generate sub method:', relativeUri, '\nbecause the sub method name could not be resolved');
  } else if (!hasMethods) {
    console.log('Failed to generate sub method:', relativeUri, '\nbecause this sub method has no sub methods');
  }

  return '';
};

/**
 * Clean RAML resource object with de-duplicated methods for collections/ids
 * @param {Object} ramlResource - The RAML resource to generate the methods and sub resources for
 * @returns {Object} deconflicted ramlResource;
 */
var deconflictRamlResource = module.exports.deconflictRamlResource = function(ramlResource){
  _.forEach(ramlResource.resources, function(resource){
    // If resource is IdParam
    if(generatorUtil.startsWithIdParam(resource.displayName)){
      // Deduplicate (remove) put and patch methods in root resource
      var resourceMethods = _.filter(ramlResource.methods, function(method){
        return _.contains(['put', 'patch'], method.method);
      });
      var resourceMethodNames = _.pluck(resourceMethods, 'method');
      var conflictedMethods = _.remove(ramlResource.methods, function(method){
        return _.contains(resourceMethodNames, method.method);
      });
      // For each conflictedMethod
      _.forEach(conflictedMethods, function(conflictedMethod){
        // Append their description to the id resource method description
        var resourceMethod = _.find(resource.methods, function(resourceMethod){
                          return resourceMethod.method === conflictedMethod.method;
                        });
        resourceMethod.description = conflictedMethod.description + '\nor ' + resourceMethod.description;
      });
    }
  });
  return ramlResource;
};

/**
 * A recursive helper method for generating resources.
 *
 * @param {Object} ramlResource - The RAML resource to generate methods and sub resources for
 * @param {Number} level - The depth of recursion mainly used for indentation
 * @param {string} relativeUri - The uri of the resource
 * @returns {string} The compiled template string.
 */
var recursResources = module.exports.recursResources = function(ramlResource, level, relativeUri) {
  var compiledResource = '';
  var uri = relativeUri + ramlResource.relativeUri;
  ramlResource = deconflictRamlResource(ramlResource);
  // If not root resource / is a collection
  if (level !== 0) {
    // and is of type collection
    if (isCollection(ramlResource)) {
      // Generate as sub resource
      compiledResource += generateSubResource(ramlResource, uri);
    } else {
      // else generate methods normally
      compiledResource += generateMethods(ramlResource, uri);
    }

    // If resource string generated.
    if (compiledResource) {
      // Add indent white space
      compiledResource = generatorUtil.indentText(indentAmount * level, compiledResource);
    }
  } else {
    // Generate methods normally
    compiledResource = generateMethods(ramlResource, uri);
  }

  var hasResources = ramlResource.resources && ramlResource.resources.length > 0;
  // If there are any resources
  // And a compiled resource exists
  if (hasResources && compiledResource) {
    ramlResource.resources
    //For Each resource in ramlResource
      .forEach(function(resource) {
        // If resource is a collection.
        var isCol = isCollection(resource);
        // Increment level by 1
        var incrementer = isCol ? 1 : 0;
        // Recursively generate the sub resources of resource
        var recursResult = recursResources(resource, level + incrementer, uri);
        recursResult = recursResult.trimRight();
        // If sub resources generated
        if (recursResult) {
          compiledResource = compiledResource.trimRight();
          // Add end of line between resources
          if (compiledResource) {
            compiledResource += ',' + endOfLine;
          }
          // Add sub resource
          compiledResource += recursResult;
          // If collection, add indent strings
          if (isCol) {
            compiledResource += endOfLine;
            compiledResource += generatorUtil.indentText(indentAmount * (level + 1), '}');
          }
        }
      });

  } else if (!hasResources && !compiledResource) {
    console.log('Failed to generate resources for uri:', uri, '\nbecause this route doesn\'t have any methods or sub resources');
  }

  return compiledResource;
};



/**
 * Generates the service methods for the provided RAML resource object
 *
 * @param {Object} ramlResource - The RAML resource to generate the methods and sub resources for
 * @param {String} _providerName_ - The name of the provider.
 * @param {Object} selectedMediaTypeExtension - The selected media type extension to use when generating resource.
 * @returns {string} The compiled template string
 */
module.exports.generate = function(ramlResource, _providerName_, selectedMediaTypeExtension) {
  providerName = _providerName_;
  // Get all of the required templates
  methodTemplateText = generatorUtil.readFileAsString(methodTemplatePath);
  subResourceTemplateText = generatorUtil.readFileAsString(subResourceTemplatePath);
  mediaTypeExtension = selectedMediaTypeExtension;
  var compiledTemplate = recursResources(ramlResource, 0, '');
  compiledTemplate = generatorUtil.indentText(indentAmount, compiledTemplate);
  return compiledTemplate;
};
