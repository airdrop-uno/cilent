export const gte = {
  address: '0xA6b579684E943F7D00d616A48cF99b5147fC57A5',
  abi: [
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'arg0',
          type: 'uint256'
        },
        {
          internalType: 'address[]',
          name: 'arg1',
          type: 'address[]'
        },
        {
          internalType: 'address',
          name: 'arg2',
          type: 'address'
        },
        {
          internalType: 'uint256',
          name: 'arg3',
          type: 'uint256'
        }
      ],
      name: 'swapExactETHForTokens',
      outputs: [
        {
          internalType: 'uint256[]',
          name: '',
          type: 'uint256[]'
        }
      ],
      stateMutability: 'payable',
      type: 'function'
    },
    {
      constant: true,
      inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'path', type: 'address[]' }
      ],
      name: 'getAmountsOut',
      outputs: [{ name: '', type: 'uint256[]' }],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    }
  ]
}

export const bronto = {
  address: '0xc063017B825091798E60e776Be426c54c10ceE0c',
  abi: [
    {
      constant: false,
      inputs: [
        {
          name: 'params',
          type: 'tuple',
          components: [
            {
              name: 'path',
              type: 'bytes'
            },
            {
              name: 'recipient',
              type: 'address'
            },
            {
              name: 'deadline',
              type: 'uint256'
            },
            {
              name: 'amountIn',
              type: 'uint256'
            },
            {
              name: 'amountOutMinimum',
              type: 'uint256'
            }
          ]
        }
      ],
      name: 'exactInput',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    }
  ]
}
