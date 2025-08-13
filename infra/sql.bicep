@description('Suffix used for naming resources (e.g., unique token)')
param nameSuffix string

@description('Location for SQL resources')
param location string

@description('Tags to apply to SQL resources')
param tags object = {}

@description('SQL administrator login name')
@minLength(1)
param sqlAdminLogin string

@description('SQL administrator login password')
@secure()
param sqlAdminPassword string

@description('Database SKU name (e.g., Basic, S0)')
@allowed([
  'Basic'
  'S0'
])
param sqlSku string = 'Basic'

var sqlServerName = 'sql-${nameSuffix}'
var sqlDatabaseName = 'sqldb-${nameSuffix}'

// SQL Server
resource sqlServer 'Microsoft.Sql/servers@2022-05-01-preview' = {
  name: sqlServerName
  location: location
  tags: tags
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

// Allow Azure services to access server
resource allowAzure 'Microsoft.Sql/servers/firewallRules@2022-05-01-preview' = {
  name: 'AllowAllWindowsAzureIps'
  parent: sqlServer
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Single database
resource database 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  name: sqlDatabaseName
  parent: sqlServer
  location: location
  sku: {
    name: sqlSku
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
  }
}

output sqlServerName string = sqlServer.name
output sqlDatabaseName string = database.name
output sqlServerFqdn string = '${sqlServer.name}.${environment().suffixes.sqlServerHostname}'
