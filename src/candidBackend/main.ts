import { call, IDL, Principal, query, update, StableBTreeMap, msgCaller } from 'azle'
import {
  Text,
  Bool,
  Nat64,
  Nat,
  Vec,
  Opt
} from '@dfinity/candid/lib/cjs/idl'

import {
  Account,
  TransferArgs,
  TransferResult,
  Value
} from './canisters/icrc_1/idl'

import {
  AllowanceArgs,
  AllowanceResult,
  ApproveArgs,
  ApproveResult,
  SupportedStandard,
  TransferFromArgs,
  TransferFromResult
} from './canisters/icrc_2/idl';

// Define Capsule structure
const Capsule = IDL.Record({
  id: Nat64,
  owner: IDL.Principal,
  contents: Vec(
    IDL.Record({
      key: Text,
      value: Text
    })
  ),
  unlockTime: Nat64,
  recipients: Vec(IDL.Principal),
  isPublic: Bool
})

// Define Heritage Token structure
const HeritageToken = IDL.Record({
  tokenId: Nat64,
  capsuleId: Nat64,
  owner: IDL.Principal,
  metadata: Vec(
    IDL.Record({
      key: Text,
      value: Text
    })
  )
})

// Define Purchase record for tracking payments
const Purchase = IDL.Record({
  buyer: IDL.Principal,
  purchaseId: Nat64,
  timestamp: Nat64,
  amount: Nat
})

type CapsuleType = {
  id: bigint
  owner: string
  contents: Record<string, any>[]
  unlockTime: bigint
  recipients: string[]
  isPublic: boolean
}

type HeritageTokenType = {
  tokenId: bigint
  capsuleId: bigint
  owner: string
  metadata: Record<string, string>[]
}

type PurchaseType = {
  buyer: string
  purchaseId: bigint
  timestamp: bigint
  amount: bigint
}

let capsules = new StableBTreeMap<bigint, CapsuleType>(0)
let tokens = new StableBTreeMap<bigint, HeritageTokenType>(1)
let purchases = new StableBTreeMap<bigint, PurchaseType>(2)

// Define capsule price (e.g., 100 tokens)
const CAPSULE_PRICE: bigint = 100n

export default class {
  @query([], IDL.Text)
  whoami(): string {
    return msgCaller().toText()
  }

  @query([], Nat)
  getCapsulePrice(): bigint {
    return CAPSULE_PRICE
  }

  @update([Text, Text, IDL.Vec(IDL.Principal), Bool, Text, Text], Nat64)
  async purchaseCapsule(
    contents: string,
    unlockTimems: string,
    recipients: string[],
    isPublic: boolean,
    canisterPrincipal: string,
    icrcPrincipal: string
  ): Promise<bigint> {
    const caller = msgCaller().toText()
    const lastId = capsules
      .keys()
      .reduce((max, id) => (id > max ? id : max), 1n)
    const id = lastId + 1n
    const unlockTime = BigInt(unlockTimems) * 1_000_000n

    // Perform token transfer to canister
    const transferArgs: TransferArgs = {
      from_subaccount: [],
      to: { owner: Principal.fromText(canisterPrincipal), subaccount: [] },
      amount: CAPSULE_PRICE,
      fee: [],
      memo: [],
      created_at_time: []
    }

    try {
      const transferResult = await this.icrc1_transfer(transferArgs, icrcPrincipal)
      if ('Ok' in transferResult) {
        // Store purchase record
        const purchaseId = id
        purchases.insert(purchaseId, {
          buyer: caller,
          purchaseId,
          timestamp: BigInt(Date.now()) * 1_000_000n,
          amount: CAPSULE_PRICE
        })

        // Store the capsule
        capsules.insert(id, {
          id,
          owner: caller,
          contents: JSON.parse(contents),
          unlockTime,
          recipients,
          isPublic
        })

        // Mint a Heritage Token
        const tokenId = id
        tokens.insert(tokenId, {
          tokenId,
          capsuleId: id,
          owner: caller,
          metadata: [
            { key: 'name', value: `Heritage Token #${id}` },
            { key: 'capsuleId', value: id.toString() }
          ]
        })

        return id
      } else {
        throw new Error('Transfer failed: ' + JSON.stringify(transferResult.Err))
      }
    } catch (err) {
      throw new Error('Purchase failed: ' + String(err))
    }
  }

  @query([Nat64], Capsule)
  getCapsule(id: bigint): any {
    try {
      const capsule = capsules.get(id)
      if (!capsule) {
        return {
          id: 0n,
          owner: Principal.fromText('aaaaa-aa'),
          contents: [],
          unlockTime: 0n,
          recipients: [],
          isPublic: false
        }
      }

      const now = BigInt(Date.now()) * 1_000_000n
      const caller = msgCaller()

      if (!caller || caller.isAnonymous()) {
        return {
          id: 0n,
          owner: Principal.fromText('aaaaa-aa'),
          contents: [],
          unlockTime: 0n,
          recipients: [],
          isPublic: false
        }
      }

      if (
        now < capsule.unlockTime &&
        !capsule.recipients.some(
          (recipient: string) => recipient === caller.toText()
        ) &&
        capsule.owner !== caller.toText()
      ) {
        return {
          id: 0n,
          owner: Principal.fromText('aaaaa-aa'),
          contents: [],
          unlockTime: 0n,
          recipients: [],
          isPublic: false
        }
      }

      return {
        id: capsule.id,
        owner: Principal.fromText(capsule.owner),
        contents: capsule.contents.map((content: Record<string, any>) => ({
          key: content.key,
          value: content.value
        })),
        unlockTime: capsule.unlockTime,
        recipients: capsule.recipients,
        isPublic: capsule.isPublic
      }
    } catch (err) {
      console.log('Error in getCapsule:', err)
      return {
        id: 0n,
        owner: Principal.fromText('aaaaa-aa'),
        contents: [],
        unlockTime: 0n,
        recipients: [],
        isPublic: false
      }
    }
  }

  @query([], IDL.Vec(Capsule))
  getPublicCapsules(): any {
    const now = BigInt(Date.now()) * 1_000_000n

    return Array.from(capsules.values())
      .filter(c => c.isPublic && now >= c.unlockTime)
      .map(t => ({
        id: t.id,
        owner: Principal.fromText(t.owner),
        contents: t.contents,
        unlockTime: t.unlockTime,
        recipients: t.recipients,
        isPublic: t.isPublic
      }))
  }

  @query([Nat64], Opt(HeritageToken))
  getHeritageToken(tokenId: bigint): any {
    const token = tokens.get(tokenId)
    if (!token) {
      return null
    }
    return {
      tokenId: token.tokenId,
      capsuleId: token.capsuleId,
      owner: Principal.fromText(token.owner),
      metadata: token.metadata.map(m => ({ key: m.key, value: m.value }))
    }
  }

  @update([Nat64, IDL.Principal], Bool)
  transferHeritageToken(tokenId: bigint, newOwner: Principal): boolean {
    const token = tokens.get(tokenId)
    if (!token || token.owner !== msgCaller().toText()) {
      return false
    }
    tokens.insert(tokenId, {
      ...token,
      owner: newOwner.toText()
    })
    return true
  }

  @query([], IDL.Vec(HeritageToken))
  getMyTokens(): any[] {
    const caller = msgCaller().toText()

    return Array.from(tokens.values())
      .filter(t => t.owner === caller)
      .map(t => ({
        tokenId: t.tokenId,
        capsuleId: t.capsuleId,
        owner: Principal.fromText(t.owner),
        metadata: t.metadata.map(m => ({ key: m.key, value: m.value }))
      }))
  }

  @query([IDL.Principal], IDL.Vec(Purchase))
  getUserPurchases(buyer: Principal): any[] {
    return Array.from(purchases.values())
      .filter(p => p.buyer === buyer.toText())
      .map(p => ({
        buyer: Principal.fromText(p.buyer),
        purchaseId: p.purchaseId,
        timestamp: p.timestamp,
        amount: p.amount
      }))
  }

  // ICRC Methods (unchanged, included for completeness)

  @query([Text], IDL.Vec(IDL.Tuple(IDL.Text, Value)), { composite: true })
  async icrc1_metadata(icrcPrincipal: string): Promise<[Text, Value][]> {
    return await call<undefined, [Text, Value][]>(
      icrcPrincipal,
      'icrc1_metadata',
      {
        returnIdlType: IDL.Vec(IDL.Tuple(IDL.Text, Value))
      }
    )
  }

  @query([Text], IDL.Text, { composite: true })
  async icrc1_name(icrcPrincipal: string): Promise<string> {
    try {
      let result = await call<undefined, string>(icrcPrincipal, 'icrc1_name', {
        returnIdlType: IDL.Text
      });
      return result;
    } catch (error) {
      // Handle the error, e.g., log it or return a default value
      return `Error calling ICRC-1 name: ${error}`
    }
  }

  @query([Text], IDL.Nat8, { composite: true })
  async icrc1_decimals(icrcPrincipal: string): Promise<number> {
    return await call<undefined, number>(icrcPrincipal, 'icrc1_decimals', {
      returnIdlType: IDL.Nat8
    })
  }

  @query([Text], IDL.Text, { composite: true })
  async icrc1_symbol(icrcPrincipal: string): Promise<string> {
    return await call<undefined, string>(icrcPrincipal, 'icrc1_symbol', {
      returnIdlType: IDL.Text
    })
  }

  @query([Text], IDL.Nat, { composite: true })
  async icrc1_fee(icrcPrincipal: string): Promise<bigint> {
    return await call<undefined, bigint>(icrcPrincipal, 'icrc1_fee', {
      returnIdlType: IDL.Nat
    })
  }

  @query([Text], IDL.Nat, { composite: true })
  async icrc1_total_supply(icrcPrincipal: string): Promise<bigint> {
    return await call<undefined, bigint>(
      icrcPrincipal,
      'icrc1_total_supply',
      {
        returnIdlType: IDL.Nat
      }
    )
  }

  @query([Text], IDL.Opt(Account), { composite: true })
  async icrc1_minting_account(icrcPrincipal: string): Promise<[Account] | []> {
    return await call<undefined, [Account] | []>(
      icrcPrincipal,
      'icrc1_minting_account',
      {
        returnIdlType: IDL.Opt(Account)
      }
    )
  }

  @query([Account, Text], IDL.Nat, { composite: true })
  async icrc1_balance_of(account: Account, icrcPrincipal: string): Promise<bigint> {
    return await call<[Account], bigint>(
      icrcPrincipal,
      'icrc1_balance_of',
      {
        paramIdlTypes: [Account],
        returnIdlType: IDL.Nat,
        args: [account]
      }
    )
  }

  @update([TransferArgs, Text], TransferResult)
  async icrc1_transfer(transferArgs: TransferArgs, icrcPrincipal: string): Promise<TransferResult> {
    return await call<[TransferArgs], TransferResult>(
      icrcPrincipal,
      'icrc1_transfer',
      {
        paramIdlTypes: [TransferArgs],
        returnIdlType: TransferResult,
        args: [transferArgs]
      }
    )
  }

  @query([Text], IDL.Vec(SupportedStandard), { composite: true })
  async icrc1_supported_standards(icrcPrincipal: string): Promise<SupportedStandard[]> {
    return await call<undefined, SupportedStandard[]>(
      icrcPrincipal,
      'icrc1_supported_standards',
      {
        returnIdlType: IDL.Vec(SupportedStandard)
      }
    )
  }

  @update([ApproveArgs, Text], ApproveResult)
  async icrc2_approve(approveArgs: ApproveArgs, icrcPrincipal: string): Promise<ApproveResult> {
    return await call<[ApproveArgs], ApproveResult>(
      icrcPrincipal,
      'icrc2_approve',
      {
        paramIdlTypes: [ApproveArgs],
        returnIdlType: ApproveResult,
        args: [approveArgs]
      }
    )
  }

  @update([TransferFromArgs, Text], TransferFromResult)
  async icrc2_transfer_from(
    transferFromArgs: TransferFromArgs,
    icrcPrincipal: string
  ): Promise<TransferFromResult> {
    return await call<[TransferFromArgs], TransferFromResult>(
      icrcPrincipal,
      'icrc2_transfer_from',
      {
        paramIdlTypes: [TransferFromArgs],
        returnIdlType: TransferFromResult,
        args: [transferFromArgs]
      }
    )
  }

  @update([AllowanceArgs, Text], AllowanceResult)
  async icrc2_allowance(
    allowanceArgs: AllowanceArgs,
    icrcPrincipal: string
  ): Promise<AllowanceResult> {
    return await call<[AllowanceArgs], AllowanceResult>(
      icrcPrincipal,
      'icrc2_allowance',
      {
        paramIdlTypes: [AllowanceArgs],
        returnIdlType: AllowanceResult,
        args: [allowanceArgs]
      }
    )
  }
}

function getIcrcPrincipal(): string {
  console.log('process.env: ', process.env);

  if (process.env.CANISTER_ID_ICRC !== undefined) {
      return process.env.CANISTER_ID_ICRC;
  }
  console.log('CANISTER_ID_ICRC is undefined')
  return 'uzt4z-lp777-77774-qaabq-cai';
}