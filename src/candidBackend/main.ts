import { IDL, Principal, query, update, StableBTreeMap, msgCaller } from 'azle'
import { Text, Int, Bool, Nat64, Vec, Null, Opt } from '@dfinity/candid/lib/cjs/idl'

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

type CapsuleType = {
  id: bigint
  owner: string
  contents: Record<string, any>[]
  unlockTime: bigint
  recipients: typeof Principal[]
  isPublic: boolean
}

let capsules = new StableBTreeMap<bigint, CapsuleType>(0)

export default class {
  @query([], IDL.Text)
  whoami (): string {
    return msgCaller().toText()
  }

  @update([Text, Text, IDL.Vec(IDL.Principal), Bool], Nat64)
  createCapsule (
    contents: string,
    unlockTimems: string,
    recipients: typeof Principal[],
    isPublic: boolean
  ): bigint {
    const caller = msgCaller().toText()

    const lastId = capsules.keys().reduce((max, id) => (id > max ? id : max), 1n);
    const id = lastId + 1n;

    const unlockTime = BigInt(unlockTimems) * 1_000_000n

    // Store the capsule
    capsules.insert(id, {
      id,
      owner: caller,
      contents: JSON.parse(contents),
      unlockTime,
      recipients,
      isPublic
    })

    return id
  }

  @query([Nat64], Capsule)
  getCapsule (id: bigint): any {
    try {
      const capsule = capsules.get(id)
      if (!capsule) {
        return {
          id: 0n,
          owner: Principal.fromText('aaaaa-aa'), // Default principal (anonymous)
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
          owner: Principal.fromText('aaaaa-aa'), // Default principal (anonymous)
          contents: [],
          unlockTime: 0n,
          recipients: [],
          isPublic: false
        }
      }

      if (
        now < capsule.unlockTime &&
        !capsule.recipients.some(
          (recipient: typeof Principal) =>
            recipient.toString() === caller.toText()
        ) &&
        capsule.owner !== caller.toText()
      ) {
        return {
          id: 0n,
          owner: Principal.fromText('aaaaa-aa'), // Default principal (anonymous)
          contents: [],
          unlockTime: 0n,
          recipients: [],
          isPublic: false
        }
      }

      // Convert CapsuleType to Candid Capsule type
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
        owner: Principal.fromText('aaaaa-aa'), // Default principal (anonymous)
        contents: [],
        unlockTime: 0n,
        recipients: [],
        isPublic: false
      }
    }
  }

  // List all public capsules (for archive feature)
  @query([], IDL.Vec(Capsule))
  getPublicCapsules (): Record<string, any> {
    const now = BigInt(Date.now()) * 1_000_000n

    return Array.from(capsules.values()).filter(
      c => c.isPublic && now >= c.unlockTime
    )
  }
}
