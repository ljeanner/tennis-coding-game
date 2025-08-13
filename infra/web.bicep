@description('The name of the static web app')
param name string

@description('The location where the static web app will be created')
param location string

@description('Tags to apply to the static web app')
param tags object = {}

@description('The SKU for the static web app')
param sku string = 'Free'

@description('Optional SQL connection string to expose to the app as AZURE_SQL_CONNECTIONSTRING')
@secure()
param sqlConnectionString string = ''

// Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    buildProperties: {
      appLocation: '/'
      outputLocation: 'dist'
      appBuildCommand: 'npm run build'
    }
  }
}

// App Settings for SWA (sets environment variables)
resource staticWebAppConfig 'Microsoft.Web/staticSites/config@2022-03-01' = if (!empty(sqlConnectionString)) {
  name: 'appsettings'
  parent: staticWebApp
  properties: {
    AZURE_SQL_CONNECTIONSTRING: sqlConnectionString
  }
}

// Output the static web app URL
output WEB_URI string = 'https://${staticWebApp.properties.defaultHostname}'
output WEB_NAME string = staticWebApp.name
