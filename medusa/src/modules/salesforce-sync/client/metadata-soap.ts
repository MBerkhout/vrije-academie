import { getSalesforceAccessToken } from "./auth"
import { logSalesforceHttpRequest, logSalesforceHttpResponse } from "./http-debug"
import {
  metadataSoapEnvelope,
  metadataSoapInstanceUrl,
  parseMetadataResults,
  type MetadataSaveResult,
} from "./metadata-xml"

function apiVersion(): string {
  return process.env.SALESFORCE_API_VERSION?.trim() || "60.0"
}

async function postMetadataSoap(
  operation: "createMetadata" | "updateMetadata",
  itemsXml: string[]
): Promise<MetadataSaveResult[]> {
  if (itemsXml.length === 0) return []

  const { access_token, instance_url } = await getSalesforceAccessToken()
  const endpoint = `${metadataSoapInstanceUrl(instance_url)}/services/Soap/m/${apiVersion()}`
  const body = metadataSoapEnvelope(operation, itemsXml, access_token)

  logSalesforceHttpRequest("POST", `/services/Soap/m/${apiVersion()}#${operation}`, {
    itemCount: itemsXml.length,
  })

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=UTF-8",
      SOAPAction: '""',
    },
    body,
  })
  const text = await res.text()
  logSalesforceHttpResponse("POST", `/services/Soap/m/${apiVersion()}#${operation}`, res.status, res.headers, text)

  if (!res.ok) {
    throw new Error(`Salesforce Metadata SOAP ${operation} HTTP ${res.status}: ${text.slice(0, 2000)}`)
  }

  return parseMetadataResults(text)
}

export async function createMetadata(itemsXml: string[]): Promise<MetadataSaveResult[]> {
  return postMetadataSoap("createMetadata", itemsXml)
}

export async function updateMetadata(itemsXml: string[]): Promise<MetadataSaveResult[]> {
  return postMetadataSoap("updateMetadata", itemsXml)
}
