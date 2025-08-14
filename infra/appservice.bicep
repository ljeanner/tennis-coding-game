@description('The name of the App Service (Web App) to create')
param appName string

@description('Location for all resources.')
param location string = resourceGroup().location

@description('Tags to apply to all resources')
param tags object = {}

@description('Base tags for supporting resources (without service name)')
param baseTags object = {}

@description('The SKU name for the App Service Plan (e.g. B1, S1)')
param sku string = 'B1'

@description('SQL connection string')
@secure()
param sqlConnectionString string

@description('Allowed CORS origins for the App')
param allowedOrigins array = []

var webAppName = appName
var hostingPlanName = 'plan-${appName}'
var applicationInsightsName = 'ai-${appName}'

// App Service Plan (Linux)
resource hostingPlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: hostingPlanName
  location: location
  tags: baseTags
  sku: {
    name: sku
    tier: (startsWith(sku, 'B') ? 'Basic' : (startsWith(sku, 'S') ? 'Standard' : 'Basic'))
    capacity: 1
  }
  properties: {
    reserved: true
  }
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  tags: baseTags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
  }
}

resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: webAppName
  location: location
  tags: tags
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|18'
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'AZURE_SQL_CONNECTIONSTRING'
          value: sqlConnectionString
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: applicationInsights.properties.InstrumentationKey
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
        {
          name: 'SCM_COMMAND_IDLE_TIMEOUT'
          value: '1800'
        }
      ]
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: union(allowedOrigins, [ 'https://portal.azure.com' ])
        supportCredentials: false
      }
    }
    httpsOnly: true
  }
}

output appServiceName string = webApp.name
output appServiceHostName string = webApp.properties.defaultHostName
output appServiceUrl string = 'https://${webApp.properties.defaultHostName}'
