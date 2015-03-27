angular.module('<%= app.name %>')

<%= resource.description %>
.factory('<%= resource.displayName %>', ['<%= provider.name %>', function(<%= provider.name %>) {
  return {
<%= resource.methods %>
  };
}])