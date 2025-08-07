targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Name of the resource group where resources will be created')
param resourceGroupName string = 'rg-${environmentName}'

// Tags that should be applied to all resources.
var tags = {
  'azd-env-name': environmentName
}

// Generate a unique token to be used in naming resources.
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))

// Create the resource group
resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

// Create the web app resources
module web 'web.bicep' = {
  name: 'web'
  scope: rg
  params: {
    name: !empty(webServiceName) ? webServiceName : 'web-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'web' })
    sku: 'Free'
  }
}

// Web service name
var webServiceName = 'swa-${resourceToken}'

// Output the web app URL
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output WEB_URI string = web.outputs.WEB_URI
output SERVICE_WEB_NAME string = web.outputs.WEB_NAME
