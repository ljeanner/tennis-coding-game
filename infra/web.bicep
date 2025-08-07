@description('The name of the static web app')
param name string

@description('The location where the static web app will be created')
param location string

@description('Tags to apply to the static web app')
param tags object = {}

@description('The SKU for the static web app')
param sku string = 'Free'

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

// Output the static web app URL
output WEB_URI string = 'https://${staticWebApp.properties.defaultHostname}'
output WEB_NAME string = staticWebApp.name
