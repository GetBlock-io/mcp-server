# MCP GetBlock Server

Model Context Protocol (MCP) server for interacting with GetBlock.io API.

## Features

- Blockchain data requests from various networks (ETH, Solana)
- Real-time blockchain statistics
- Wallet balance checking
- Transaction status monitoring
- Getting Solana account information
- Getting current gas price in Ethereum
- JSON-RPC interface to blockchain nodes
- Environment-based configuration for API tokens

## Installation

### Option 1: Standard Node.js Installation

1. Install dependencies:
```bash
npm install
```

2. Compile TypeScript:
```bash
npm run build
```

3. Create a `.env` file with access tokens for different blockchains (optional):
```
# Access tokens for different blockchains
ETH_ACCESS_TOKEN=your_eth_access_token_here
SOLANA_ACCESS_TOKEN=your_solana_access_token_here
```

4. Start the server:
```bash
npm start
```

### Option 2: Using Docker

1. Build the Docker image:
```bash
docker build -t mcp/getblock:latest .
```

2. Run the container with environment variables:
```bash
docker run -i --rm \
  -e ETH_ACCESS_TOKEN=your_eth_access_token_here \
  -e SOLANA_ACCESS_TOKEN=your_solana_access_token_here \
  mcp/getblock:latest
```

## Development

For development, you can use the command:
```bash
npm run dev
```

This command will compile TypeScript and start the server.

## Use with Claude Desktop, Cursor, or other IDE

### Option 1: Direct Launch via Node.js

1. Configure Claude Desktop to use this server by editing `claude_desktop_config.json`:
```json
{
    "mcpServers": {
        "getblock": {
            "command": "npm",
            "args": [
                "start",
                "--prefix",
                "/ABSOLUTE/PATH/TO/mcp-getblock"
            ],
            "env": {
                "ETH_ACCESS_TOKEN": "your_eth_access_token_here",
                "SOLANA_ACCESS_TOKEN": "your_solana_access_token_here"
            }
        }
    }
}
```

### Option 2: Launch via Docker

1. Configure Claude Desktop to use the Docker container:
```json
{
    "mcpServers": {
        "getblock": {
            "command": "docker",
            "args": [
                "run",
                "-i",
                "--rm",
                "-e",
                "ETH_ACCESS_TOKEN",
                "-e",
                "SOLANA_ACCESS_TOKEN",
                "mcp/getblock:latest"
            ],
            "env": {
                "ETH_ACCESS_TOKEN": "your_eth_access_token_here",
                "SOLANA_ACCESS_TOKEN": "your_solana_access_token_here"
            }
        }
    }
}
```

2. Restart Claude Desktop
3. You should see the available tools in the toolbar

## Available Tools

1. `get-chain-info` - get general information about a blockchain network (ETH, Solana)
2. `get-wallet-balance` - check wallet balance on the blockchain
3. `get-transaction` - get details about a specific transaction
4. `get-latest-blocks` - get information about the latest blocks
5. `get-solana-account` - get information about a Solana account
6. `get-eth-gas-price` - get current gas price in the Ethereum network

### Detailed Tool Descriptions

#### get-chain-info
```json
{
  "name": "get-chain-info",
  "description": "Get general information about a blockchain network",
  "inputSchema": {
    "properties": {
      "chain": {
        "type": "string",
        "description": "Blockchain network (e.g., eth, solana)",
        "default": "eth"
      }
    }
  }
}
```

#### get-wallet-balance
```json
{
  "name": "get-wallet-balance",
  "description": "Get the balance of a wallet address on a blockchain",
  "inputSchema": {
    "properties": {
      "address": {
        "type": "string",
        "description": "The wallet address to check"
      },
      "chain": {
        "type": "string",
        "description": "Blockchain network (e.g., eth, solana)",
        "default": "eth"
      }
    },
    "required": ["address"]
  }
}
```

#### get-transaction
```json
{
  "name": "get-transaction",
  "description": "Get details of a specific transaction",
  "inputSchema": {
    "properties": {
      "txid": {
        "type": "string",
        "description": "Transaction ID/hash"
      },
      "chain": {
        "type": "string",
        "description": "Blockchain network (e.g., eth, solana)",
        "default": "eth"
      }
    },
    "required": ["txid"]
  }
}
```

## Access Token Priority Order

Access tokens are used in the following priority order:
1. Tokens passed through environment variables (`env` in claude_desktop_config.json)
2. Tokens from the .env file
3. Default values (if not specified in items 1 and 2)

## Architecture & Technology Stack

- **Language**: TypeScript (compiled to JavaScript)
- **Runtime**: Node.js
- **Communication Protocol**: Model Context Protocol (MCP)
- **API Integration**: GetBlock.io JSON-RPC API
- **Authentication**: Token-based API authentication
- **Transport Layer**: Standard I/O (stdio) for communication with Claude Desktop
- **Dependencies**:
  - `@modelcontextprotocol/sdk`: For MCP implementation
  - `axios`: HTTP client for API requests
  - `dotenv`: Environment variable management

## Supported Networks

As of June 2025, this MCP server supports the following blockchain networks:

### Primary Networks
- **Ethereum (ETH)** - Full support for balance, transaction, block, and gas price queries
- **Solana (SOL)** - Support for balance, account info, transaction, and block queries

### Future Expansions
Support for additional networks from GetBlock.io's infrastructure (which includes over 75+ blockchain networks [[1]](https://getblock.io/faq/)) can be implemented by extending the current codebase.

## Examples of Usage

### Checking ETH Balance

You can ask Claude to check the balance of an Ethereum wallet by using the `get-wallet-balance` tool:

```
What is the balance of this Ethereum wallet: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?
```

### Viewing Transaction Details

To get information about a specific transaction:

```
Can you show me the details of this Ethereum transaction: 0x0ac94a788a79e3eaa72a33f1da97b79728b570054fe156a7f60e06f5791aaf36?
```

### Getting Current Gas Price

To check the current gas prices on Ethereum:

```
What are the current gas prices on Ethereum?
```

## Implementation Details

### Server Architecture

The server follows a simple architecture:

1. **Initialization**: The server initializes using the MCP SDK and configures the supported tools
2. **Tool Registration**: Each blockchain operation is registered as a separate tool with its own input schema
3. **Request Handling**: Incoming requests are processed by the main handler which:
   - Extracts the tool name and arguments
   - Validates input parameters
   - Constructs the appropriate JSON-RPC call to GetBlock API
   - Processes the response and returns formatted results
4. **Authentication**: API tokens are managed with a priority system using environment variables

### Code Structure

- **Tool Definitions**: Each blockchain operation is defined as a separate tool with metadata
- **Request Handler**: Main logic for processing tool invocations
- **API Integration**: Helper functions for constructing and sending requests to GetBlock
- **Response Processing**: Formatting and conversion of blockchain data (e.g., wei to ether)

## Troubleshooting

### API Connection Issues

If you encounter connection issues to the GetBlock API:

1. Verify that your access tokens are correctly set in environment variables or .env file
2. Check if the GetBlock service is operational
3. Ensure your network can reach the GetBlock API servers

### Invalid Response Format

If you receive error messages about invalid response format:

1. Verify that the blockchain and method you're using are supported by GetBlock
2. Check if your access token has sufficient permissions
3. Ensure the parameters are correctly formatted for the specific blockchain
