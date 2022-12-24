import { Signer } from 'ethers'
import {
  useContract as useWagmiContract,
  useContractEvent as useWagmiContractEvent,
  // useContractInfiniteReads as useWagmiContractInfiniteReads,
  useContractRead as useWagmiContractRead,
  useContractReads as useWagmiContractReads,
  useContractWrite as useWagmiContractWrite,
  usePrepareContractWrite,
  useToken as useWagmiToken,
} from 'wagmi'

import {
  Provider,
  getContract as getContractWagmi,
  readContract as readContractWagmi,
  readContracts as readContractsWagmi,
  prepareWriteContract,
  writeContract as writeContractWagmi,
  watchReadContract as watchReadContractWagmi,
  watchReadContracts as watchReadContractsWagmi,
} from '@wagmi/core'

interface IContract {
  abi: any
  address: string
  token?: boolean
}

interface ICreateContractHooks {
  contracts: {
    [network: string]: {
      [key: string]: IContract
    }
  }
  wagmiClient: any
}

export const createContractHooks = ({
  contracts,
  wagmiClient,
}: ICreateContractHooks): {
  functions: any,
  hooks: any
} => {
  let currentNetwork = wagmiClient.provider.network.name
  let networkContracts = contracts[currentNetwork]
  wagmiClient.provider.on('network', (newNetwork: any) => {
    currentNetwork = newNetwork.name
    networkContracts = contracts[currentNetwork]
  })

  const functions = {
    getContract: (
      contractName: string,
      signerOrProvider?: Signer | Provider,
    ): ReturnType<typeof getContractWagmi> => {
      const contract = networkContracts[contractName]
      const args = {
        abi: contract.abi,
        address: contract.address,
      }

      return getContractWagmi(
        signerOrProvider ? Object.assign(args, { signerOrProvider }) : args,
      )
    },
    readContract: (
      contractName: string,
      functionName: string,
      ...optionalArgs: Partial<Parameters<typeof readContractWagmi>>
    ) => {
      const contract = networkContracts[contractName]

      return readContractWagmi({
        abi: contract.abi,
        address: contract.address,

        functionName,
        ...optionalArgs,
      })
    },
    readContracts: (params: {
      [contractName: string]: {
        functionName: string
      } & Partial<Parameters<typeof readContractsWagmi>>
    }) => {
      const converted = Object.entries(params).reduce(
        (acc, [contractName, { functionName, ...optionalArgs }]) => {
          const contract = networkContracts[contractName]
          acc.push({
            ...optionalArgs,
            abi: contract.abi,
            address: contract.address,
            functionName,
          })
          return acc
        },
        [] as any,
      )

      return readContractsWagmi(converted)
    },
    writeContract: async (
      contractName: string,
      functionName: string,
      ...optionalArgs: Partial<Parameters<typeof writeContractWagmi>>
    ) => {
      const contract = networkContracts[contractName]
      const config = await prepareWriteContract({
        ...optionalArgs,
        abi: contract.abi,
        address: contract.address,
        functionName,
      })

      return writeContractWagmi(config)
    },
    watchReadContract: (
      contractName: string,
      functionName: string,
      listener: (...args: any[]) => void,
      ...optionalArgs: Partial<Parameters<typeof watchReadContractWagmi>>
    ) => {
      const contract = networkContracts[contractName]

      return watchReadContractWagmi(
        {
          ...optionalArgs,
          abi: contract.abi,
          address: contract.address,
          functionName,
        },
        listener,
      )
    },
    watchReadContracts: (
      params: {
        [contractName: string]: {
          functionName: string
          args?: any
          chainId?: number
        } & Partial<Parameters<typeof watchReadContractsWagmi>>
      },
      listener: (...args: any[]) => void,
    ) => {
      const converted = Object.entries(params).reduce(
        (acc, [contractName, { functionName, ...optionalArgs }]) => {
          const contract = networkContracts[contractName]
          acc.push({
            ...optionalArgs,
            abi: contract.abi,
            address: contract.address,
            functionName,
          })
          return acc
        },
        [] as any,
      )

      return watchReadContractsWagmi(
        {
          contracts: converted,
        },
        listener,
      )
    },
  }

  const hooks = {
    useContract: (
      contractName: string,
      signerOrProvider?: Signer | Provider,
    ): ReturnType<typeof useWagmiContract> => {
      const contract = networkContracts[contractName]
      const args = {
        abi: contract.abi,
        address: contract.address,
      }

      return useWagmiContract(
        signerOrProvider ? Object.assign(args, { signerOrProvider }) : args,
      )
    },
    useContractEvent: (
      contractName: string,
      eventName: string,
      listener: (...args: any[]) => void,
      optionalArgs?: Parameters<typeof useWagmiContractEvent>,
    ): ReturnType<typeof useWagmiContractEvent> => {
      const contract = networkContracts[contractName]
      return useWagmiContractEvent({
        ...optionalArgs,
        abi: contract.abi,
        address: contract.address,
        eventName,
        listener,
      })
    },
    useContractRead: (
      contractName: string,
      functionName: string,
      ...optionalArgs: Partial<Parameters<typeof useWagmiContractRead>>
    ) => {
      const contract = networkContracts[contractName]
      return useWagmiContractRead({
        ...optionalArgs,
        abi: contract.abi,
        address: contract.address,
        functionName,
      })
    },
    useContractReads: (params: {
      [contractName: string]: {
        functionName: string
      } & Partial<Parameters<typeof useWagmiContractRead>>
    }) => {
      const converted = Object.entries(params).reduce(
        (acc, [contractName, { functionName, ...optionalArgs }]) => {
          const contract = networkContracts[contractName]
          acc.push({
            ...optionalArgs,
            abi: contract.abi,
            address: contract.address,
            functionName,
          })
          return acc
        },
        [] as any,
      )

      return useWagmiContractReads(converted)
    },
    useContractWrite: (
      contractName: string,
      functionName: string,
      ...optionalArgs: Partial<Parameters<typeof useWagmiContractWrite>>
    ) => {
      const contract = networkContracts[contractName]
      const { config } = usePrepareContractWrite({
        ...optionalArgs,
        abi: contract.abi,
        address: contract.address,
        functionName,
      })

      return useWagmiContractWrite(config)
    },
    useToken: (
      tokenName: string,
      ...optionalArgs: Partial<Parameters<typeof useWagmiToken>>
    ): ReturnType<typeof useWagmiToken> => {
      const tokens = Object.keys(networkContracts).reduce(
        (acc, contractName) => {
          const contract = networkContracts[contractName]
          if (contract.token) {
            acc[contractName] = contract
          }
          return acc
        },
        {} as any,
      )

      const token = tokens[tokenName]

      return useWagmiToken({
        address: token.address,
        ...optionalArgs,
      })
    },
  }

  return { functions, hooks }
}
