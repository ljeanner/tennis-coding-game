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

@description('SQL administrator login name')
@minLength(1)
param sqlAdminLogin string = 'sqladmin'

@description('SQL administrator login password')
@secure()
param sqlAdminPassword string

@description('Database SKU: Basic or S0')
@allowed([
  'Basic'
  'S0'
])
param sqlSku string = 'Basic'

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

// Web service name
var webServiceName = 'swa-${resourceToken}'

// Create the web app resources
module web 'web.bicep' = {
  name: 'web'
  scope: rg
  params: {
    name: !empty(webServiceName) ? webServiceName : 'web-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'web' })
    sku: 'Free'
    sqlConnectionString: sqlConnectionString
  }
}

// SQL resources
module sql 'sql.bicep' = {
  name: 'sql'
  scope: rg
  params: {
    nameSuffix: resourceToken
    location: location
    tags: tags
    sqlAdminLogin: sqlAdminLogin
    sqlAdminPassword: sqlAdminPassword
    sqlSku: sqlSku
  }
}

// Build connection string for SWA app settings
var sqlHost = sql.outputs.sqlServerFqdn
var sqlDbName = sql.outputs.sqlDatabaseName
var sqlConnectionString = 'Server=tcp:${sqlHost},1433;Initial Catalog=${sqlDbName};Persist Security Info=False;User ID=${sqlAdminLogin};Password=${sqlAdminPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'

output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output WEB_URI string = web.outputs.WEB_URI
output SERVICE_WEB_NAME string = web.outputs.WEB_NAME
