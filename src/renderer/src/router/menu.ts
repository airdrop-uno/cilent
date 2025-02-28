import { h } from 'vue'
import type { MenuOption } from 'naive-ui'
import type { Component } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Water,
  AccessibilitySharp,
  AirplaneOutline,
  Planet,
  HomeOutline,
  WalletSharp,
  BuildOutline,
  Apps
} from '@vicons/ionicons5'
import { NIcon } from 'naive-ui'
function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}
export const menuOptions: MenuOption[] = [
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            path: '/'
          }
        },
        { default: () => '首页' }
      ),
    key: '/',
    icon: renderIcon(HomeOutline)
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            path: '/account'
          }
        },
        { default: () => '账号管理' }
      ),
    key: '/account',
    disabled: true,
    icon: renderIcon(WalletSharp)
  },
  {
    label: '水龙头',
    key: 'Faucet',
    disabled: true,
    icon: renderIcon(Water),
    children: [
      //   {
      //     label: () =>
      //       h(
      //         RouterLink,
      //         {
      //           to: {
      //             path: '/faucet/sepolia'
      //           }
      //         },
      //         { default: () => 'Sepolia' }
      //       ),
      //     disabled: true,
      //     key: 'Sepolia'
      //   },
      //   {
      //     label: () =>
      //       h(
      //         RouterLink,
      //         {
      //           to: {
      //             path: '/faucet/oerli'
      //           }
      //         },
      //         { default: () => 'Goerli' }
      //       ),
      //     disabled: true,
      //     key: 'Goerli'
      //   }
    ]
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: { path: '/tools' }
        },
        { default: () => '工具' }
      ),
    key: '/tools',
    disabled: true,
    icon: renderIcon(BuildOutline)
  },
  {
    label: '空投',
    key: 'Airdrop',
    disabled: true,
    icon: renderIcon(AirplaneOutline),
    children: [
      {
        label: () =>
          h(
            RouterLink,
            {
              to: {
                path: '/airdrop/monad'
              }
            },
            { default: () => 'Monad' }
          ),
        disabled: true,
        key: '/airdrop/monad'
      }
    ]
  },
  {
    label: 'DePIN 挂机',
    key: 'DePIN',
    icon: renderIcon(Planet),
    children: [
      {
        label: () =>
          h(
            RouterLink,
            {
              to: { path: '/depin/stork' }
            },
            'Stork Verify'
          ),
        key: '/depin/stork',
        disabled: true
      },
      {
        label: () => h(RouterLink, { to: { path: '/depin/nodeGo' } }, 'NodeGo'),
        key: '/depin/nodeGo',
        disabled: true
      },
      {
        label: () =>
          h(RouterLink, { to: { path: '/depin/monadScore' } }, 'MonadScore'),
        key: '/depin/monadScore'
      }
    ]
  },
  {
    label: () =>
      h(
        RouterLink,
        {
          to: {
            path: '/profile'
          }
        },
        { default: () => 'Profile' }
      ),
    key: '/profile',
    icon: renderIcon(AccessibilitySharp)
  },
  {
    label: '系统',
    key: '/system',
    icon: renderIcon(Apps),
    children: [
      {
        label: () =>
          h(
            RouterLink,
            {
              to: { path: '/system/proxy' }
            },
            '代理'
          ),
        key: '/system/proxy'
      }
    ]
  }
]
