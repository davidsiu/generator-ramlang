<% _.forEach(methods, function(method) {%>
<%= method.description %>
<%= method.factoryMethodName %>: function(<%= method.queryParameters %>) {
  return <%= method.apiProviderName %>.<%= method.apiMethodName %>(<%= method.apiQueryParameters %>);
}<%= method.separator %>
<% }); %>