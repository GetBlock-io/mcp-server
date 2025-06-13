#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// GetBlock API configuration
const GETBLOCK_API_BASE = 'https://go.getblock.io';

// Define tools
const CHAIN_INFO_TOOL: Tool = {
  name: "get-chain-info",
  description: "Get general information about a blockchain network",
  inputSchema: {
    type: "object",
    properties: {
      chain: {
        type: "string",
        description: "Blockchain network (e.g., eth, solana)",
        default: "eth"
      }
    },
    required: []
  }
};

const WALLET_BALANCE_TOOL: Tool = {
  name: "get-wallet-balance",
  description: "Get the balance of a wallet address on a blockchain",
  inputSchema: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "The wallet address to check"
      },
      chain: {
        type: "string",
        description: "Blockchain network (e.g., eth, solana)",
        default: "eth"
      }
    },
    required: ["address"]
  }
};

const TRANSACTION_TOOL: Tool = {
  name: "get-transaction",
  description: "Get details of a specific transaction",
  inputSchema: {
    type: "object",
    properties: {
      txid: {
        type: "string",
        description: "Transaction ID/hash"
      },
      chain: {
        type: "string",
        description: "Blockchain network (e.g., eth, solana)",
        default: "eth"
      }
    },
    required: ["txid"]
  }
};

const LATEST_BLOCKS_TOOL: Tool = {
  name: "get-latest-blocks",
  description: "Get information about recent blocks",
  inputSchema: {
    type: "object",
    properties: {
      count: {
        type: "number",
        description: "Number of recent blocks to fetch",
        default: 5
      },
      chain: {
        type: "string",
        description: "Blockchain network (e.g., eth, solana)",
        default: "eth"
      }
    },
    required: []
  }
};

const SOLANA_ACCOUNT_TOOL: Tool = {
  name: "get-solana-account",
  description: "Get account information from Solana blockchain",
  inputSchema: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "The Solana account address"
      }
    },
    required: ["address"]
  }
};

const ETH_GAS_PRICE_TOOL: Tool = {
  name: "get-eth-gas-price",
  description: "Get current gas price on Ethereum network",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
};

// Initialize the server
const server = new Server(
  {
    name: "mcp-getblock",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Helper function to get access tokens from environment or context
function getAccessToken(chain: string, context?: { env?: Record<string, string> }): string {
  if (chain === 'eth') {
    // Priority:
    // 1. context.env if exists
    // 2. process.env from .env file
    // 3. Default value
    return context?.env?.ETH_ACCESS_TOKEN || process.env.ETH_ACCESS_TOKEN || 'YOUR_ETH_TOKEN_HERE';
  } else if (chain === 'solana') {
    return context?.env?.SOLANA_ACCESS_TOKEN || process.env.SOLANA_ACCESS_TOKEN || 'YOUR_SOLANA_TOKEN_HERE';
  }
  return '';
}

// Helper function for making requests to GetBlock API with appropriate authentication
async function makeGetBlockRequest(
  method: string,
  params: any[] = [],
  chain = 'eth',
  jsonrpc = '2.0',
  id = 1,
  context?: { env?: Record<string, string> }
) {
  try {
    // Select the appropriate authentication token based on chain
    const headers = {
      'Content-Type': 'application/json',
    };
    
    let url = GETBLOCK_API_BASE;
    // Add appropriate authentication based on chain
    if (chain === 'eth') {
      url += `/${getAccessToken('eth', context)}`;
    } else if (chain === 'solana') {
      url += `/${getAccessToken('solana', context)}`;
    }
    
    const response = await axios({
      method: 'post',
      url,
      headers,
      data: {
        jsonrpc,
        method,
        params,
        id
      }
    });

    if (response.data.error) {
      return {
        error: true,
        message: response.data.error.message || 'Unknown error occurred'
      };
    }

    return {
      error: false,
      data: response.data.result
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect to GetBlock API';
    return {
      error: true,
      message: errorMessage
    };
  }
}

// Register tools with handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    CHAIN_INFO_TOOL,
    WALLET_BALANCE_TOOL,
    TRANSACTION_TOOL,
    LATEST_BLOCKS_TOOL,
    SOLANA_ACCOUNT_TOOL,
    ETH_GAS_PRICE_TOOL
  ],
}));

// Main handler for tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args = {} } = request.params;
    // Getting environment variables from the process, not from request context
    const context = { env: process.env as Record<string, string> };

    switch (name) {
      case "get-chain-info": {
        const { chain = "eth" } = args as { chain?: string };
        let method: string;
        let params: any[] = [];
        
        if (chain === 'eth') {
          method = 'eth_getBlockByNumber';
          params = ['latest', false];
        } else if (chain === 'solana') {
          method = 'getVersion';
        } else {
          return {
            content: [{ type: "text", text: `Chain ${chain} not supported for info checking` }],
            isError: true,
          };
        }
        
        const result = await makeGetBlockRequest(method, params, chain, '2.0', 1, context);
        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.message}` }],
            isError: true,
          };
        }
        
        return {
          content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
          isError: false,
        };
      }

      case "get-wallet-balance": {
        const { address, chain = "eth" } = args as { address: string; chain?: string };
        if (!address) {
          return {
            content: [{ type: "text", text: "Address is required" }],
            isError: true,
          };
        }

        let method: string;
        let params: any[];
        
        if (chain === 'eth') {
          method = 'eth_getBalance';
          params = [address, 'latest'];
          
          const result = await makeGetBlockRequest(method, params, chain, '2.0', 1, context);
          if (result.error) {
            return {
              content: [{ type: "text", text: `Error: ${result.message}` }],
              isError: true,
            };
          }
          
          // Convert wei to ether
          const balanceInWei = parseInt(result.data, 16);
          const balanceInEther = balanceInWei / 1e18;
          return {
            content: [{ type: "text", text: `Address ${address} has balance: ${balanceInEther} ETH` }],
            isError: false,
          };
        } else if (chain === 'solana') {
          method = 'getBalance';
          params = [address];
          
          const result = await makeGetBlockRequest(method, params, chain, '2.0', 1, context);
          if (result.error) {
            return {
              content: [{ type: "text", text: `Error: ${result.message}` }],
              isError: true,
            };
          }
          
          // Convert lamports to SOL
          const balanceInLamports = result.data.value;
          const balanceInSol = balanceInLamports / 1e9;
          return {
            content: [{ type: "text", text: `Address ${address} has balance: ${balanceInSol} SOL` }],
            isError: false,
          };
        } else {
          return {
            content: [{ type: "text", text: `Chain ${chain} not supported for balance checking` }],
            isError: true,
          };
        }
      }

      case "get-transaction": {
        const { txid, chain = "eth" } = args as { txid: string; chain?: string };
        if (!txid) {
          return {
            content: [{ type: "text", text: "Transaction ID is required" }],
            isError: true,
          };
        }

        let method: string;
        let params: any[];
        
        if (chain === 'eth') {
          method = 'eth_getTransactionByHash';
          params = [txid];
        } else if (chain === 'solana') {
          method = 'getTransaction';
          params = [txid, { encoding: "json" }];
        } else {
          return {
            content: [{ type: "text", text: `Chain ${chain} not supported for transaction lookup` }],
            isError: true,
          };
        }
        
        const result = await makeGetBlockRequest(method, params, chain, '2.0', 1, context);
        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.message}` }],
            isError: true,
          };
        }
        
        return {
          content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
          isError: false,
        };
      }

      case "get-latest-blocks": {
        const { count = 5, chain = "eth" } = args as { count?: number; chain?: string };
        try {
          // First get the current block height/number
          let currentBlockNumber: number;
          
          if (chain === 'eth') {
            const blockResult = await makeGetBlockRequest('eth_blockNumber', [], chain, '2.0', 1, context);
            if (blockResult.error) {
              return {
                content: [{ type: "text", text: `Error getting block number: ${blockResult.message}` }],
                isError: true,
              };
            }
            currentBlockNumber = parseInt(blockResult.data, 16);
          } else if (chain === 'solana') {
            const blockResult = await makeGetBlockRequest('getBlockHeight', [], chain, '2.0', 1, context);
            if (blockResult.error) {
              return {
                content: [{ type: "text", text: `Error getting block height: ${blockResult.message}` }],
                isError: true,
              };
            }
            currentBlockNumber = blockResult.data;
          } else {
            return {
              content: [{ type: "text", text: `Chain ${chain} not supported for block fetching` }],
              isError: true,
            };
          }
          
          // Now fetch the specified number of recent blocks
          const blocks = [];
          for (let i = 0; i < count; i++) {
            const blockNum = currentBlockNumber - i;
            
            if (chain === 'eth') {
              const blockHex = '0x' + blockNum.toString(16);
              const result = await makeGetBlockRequest('eth_getBlockByNumber', [blockHex, false], chain, '2.0', 1, context);
              if (!result.error) {
                blocks.push(result.data);
              }
            } else if (chain === 'solana') {
              const result = await makeGetBlockRequest('getBlock', [blockNum, { encoding: "json" }], chain, '2.0', 1, context);
              if (!result.error) {
                blocks.push(result.data);
              }
            }
          }
          
          return {
            content: [{ type: "text", text: JSON.stringify(blocks, null, 2) }],
            isError: false,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }

      case "get-solana-account": {
        const { address } = args as { address: string };
        if (!address) {
          return {
            content: [{ type: "text", text: "Address is required" }],
            isError: true,
          };
        }

        const method = 'getAccountInfo';
        const params = [address, { encoding: "jsonParsed" }];
        
        const result = await makeGetBlockRequest(method, params, 'solana', '2.0', 1, context);
        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.message}` }],
            isError: true,
          };
        }
        
        return {
          content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
          isError: false,
        };
      }

      case "get-eth-gas-price": {
        const method = 'eth_gasPrice';
        
        const result = await makeGetBlockRequest(method, [], 'eth', '2.0', 1, context);
        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.message}` }],
            isError: true,
          };
        }
        
        // Convert wei to gwei
        const gasPriceInWei = parseInt(result.data, 16);
        const gasPriceInGwei = gasPriceInWei / 1e9;
        
        return {
          content: [{ type: "text", text: `Current Ethereum gas price: ${gasPriceInGwei} Gwei` }],
          isError: false,
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GetBlock MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
}); 