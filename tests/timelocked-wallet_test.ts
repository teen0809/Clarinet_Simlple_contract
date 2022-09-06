
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.31.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Allows the contract owner to lock an amount",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const beneficiary = accounts.get("wallet_1")!;
      const amount = 10;
      const block = chain.mineBlock([
        Tx.contractCall("timelocked-wallet", "lock", [
          types.principal(beneficiary.address),
          types.uint(10),
          types.uint(amount),
        ], deployer.address),
      ]);
  
      // The lock should be successful.
      block.receipts[0].result.expectOk().expectBool(true);
      // There should be a STX transfer of the amount specified.
      block.receipts[0].events.expectSTXTransferEvent(
        amount,
        deployer.address,
        `${deployer.address}.timelocked-wallet`,
      );
    },
  });
  
  Clarinet.test({
    name: "Does not allow anyone else to lock an amount",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const accountA = accounts.get("wallet_1")!;
      const beneficiary = accounts.get("wallet_2")!;
      const block = chain.mineBlock([
        Tx.contractCall("timelocked-wallet", "lock", [
          types.principal(beneficiary.address),
          types.uint(10),
          types.uint(10),
        ], accountA.address),
      ]);
  
      // Should return err-owner-only (err u100).
      block.receipts[0].result.expectErr().expectUint(100);
    },
  });
  
  Clarinet.test({
    name: "Cannot lock more than once",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const beneficiary = accounts.get("wallet_1")!;
      const amount = 10;
      const block = chain.mineBlock([
        Tx.contractCall("timelocked-wallet", "lock", [
          types.principal(beneficiary.address),
          types.uint(10),
          types.uint(amount),
        ], deployer.address),
        Tx.contractCall("timelocked-wallet", "lock", [
          types.principal(beneficiary.address),
          types.uint(10),
          types.uint(amount),
        ], deployer.address),
      ]);
  
      // The first lock worked and STX were transferred.
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[0].events.expectSTXTransferEvent(
        amount,
        deployer.address,
        `${deployer.address}.timelocked-wallet`,
      );
  
      // The second lock fails with err-already-locked (err u101).
      block.receipts[1].result.expectErr().expectUint(101);
  
      // Assert there are no transfer events.
      assertEquals(block.receipts[1].events.length, 0);
    },
  });
  
  Clarinet.test({
    name: "Unlock height cannot be in the past",
    async fn(chain: Chain, accounts: Map<string, Account>) {
      const deployer = accounts.get("deployer")!;
      const beneficiary = accounts.get("wallet_1")!;
      const targetBlockHeight = 10;
      const amount = 10;
  
      // Advance the chain until the unlock height plus one.
      chain.mineEmptyBlockUntil(targetBlockHeight + 1);
  
      const block = chain.mineBlock([
        Tx.contractCall("timelocked-wallet", "lock", [
          types.principal(beneficiary.address),
          types.uint(targetBlockHeight),
          types.uint(amount),
        ], deployer.address),
      ]);
  
      // The second lock fails with err-unlock-in-past (err u102).
      block.receipts[0].result.expectErr().expectUint(102);
  
      // Assert there are no transfer events.
      assertEquals(block.receipts[0].events.length, 0);
    },
  });
