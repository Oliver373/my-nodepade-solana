import * as borsh from "borsh";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import { serialize, deserialize, deserializeUnchecked } from "borsh";
import { Buffer } from "buffer";
// Manually initialize variables that are automatically defined in Playground
const PROGRAM_ID = new web3.PublicKey("6zggdDfaFgYnkTiSUJk9kcpKshmaSCWQc1uDkptrWYyT");
const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");
const wallet = { keypair: web3.Keypair.generate() };



class Assignable {
  constructor(properties) {
    Object.keys(properties).map((key) => {
      return (this[key] = properties[key]);
    });
  }
}

class GreetingAccount {
  counter = 0;
  constructor(fields: { counter: number } | undefined = undefined) {
    if (fields) {
      this.counter = fields.counter;
    }
  }
}

const GreetingSchema = new Map([
  [GreetingAccount, { kind: "struct", fields: [["counter", "u32"]] }],
]);

class CreateAccount {
  title = "";
  msg = "";
  owner = "";
  constructor(fields: { title: string, msg: string, owner: string } | undefined = undefined) {
    if (fields) {
      this.title = fields.title;
      this.msg = fields.msg;
      this.owner = fields.owner;
    }
  }
}

const CreateSchema = new Map([
  [
    CreateAccount, 
    {
      kind: "struct",
      fields: [
        ["title", "String"],
        ["msg", "String"],
        ["owner", "String"],
      ],
    },
  ],
]);

// Our instruction payload vocabulary
class GreetingInstruction extends Assignable {}
class CreateInstruction extends Assignable {}
class ModifyInstruction extends Assignable {}

// Borsh needs a schema describing the payload
const GreetingInstructionSchema = new Map([
  [
    GreetingInstruction,
    {
      kind: "struct",
      fields: [
        ["id", "u8"],
        ["counter", "u32"],
      ],
    },
  ],
]);

const CreateInstructionSchema = new Map([
  [
    CreateInstruction,
    {
      kind: "struct",
      fields: [
        ["id", "u8"],
        ["title", "String"],
        ["msg", "String"],
        ["owner", "String"],
      ],
    },
  ],
]);

const ModifyInstructionSchema = new Map([
  [
    ModifyInstruction,
    {
      kind: "struct",
      fields: [
        ["id", "u8"],
        ["title", "String"],
        ["msg", "String"],
        ["owner", "String"],
      ],
    },
  ],
]);

enum InstructionVariant {
  Greeting = 0,
  Create  = 1,
  Modify = 2,
}

// title 创建后无法修改，根据title和pubkey寻找对应pda account
const title = "new note title";

// 没有bs58库，为方便使用把钱包地址直接写在这
const wallet1_address = "3BXNCqvuGVAw4wrdW1fsdEEYhB8Z817zFt4x2VQHHWqt";
const wallet1_address_arr = [32,105,132,52,112,37,99,182,102,237,85,132,165,227,177,6,131,250,25,160,121,10,108,126,45,141,231,25,154,218,87,135];
const wallet2_address = "2egcEQF8Cbc55NUouwweanZ3scea2qiG38hzXcuLBpjS";
const wallet2_address_arr = [24,130,246,12,125,182,187,139,24,68,106,185,190,200,171,195,74,209,122,6,50,24,94,1,153,14,219,9,99,197,240,57];


describe("Test", () => {

  it("create", async () => {
    const msg = "test body";

    const createInstruction = new CreateInstruction({
      id: InstructionVariant.Create,
      title: title,
      msg: msg,
      owner: wallet2_address,
    });
    // Serialize the payload
    const CreateSerBuf = Buffer.from(
      serialize(CreateInstructionSchema, createInstruction)
    );

    // get pda account
    const [note_pubkey, ] = web3.PublicKey.findProgramAddressSync([wallet.keypair.publicKey.toBuffer(), Buffer.from(title)],PROGRAM_ID);
    console.log("note_pubkey: ", note_pubkey.toBase58());

    // Create create instruction
    const createIx = new web3.TransactionInstruction({
      data: CreateSerBuf,
      keys: [
        {
          pubkey: wallet.keypair.publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: note_pubkey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: web3.SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: PROGRAM_ID,
    });

    // Create transaction and add the instructions
    const tx = new web3.Transaction();
    tx.add(createIx);
    // Send and confirm the transaction
    const txHash = await web3.sendAndConfirmTransaction(connection, tx, [
      wallet.keypair
    ]).catch(error => {console.error(error);});
    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

    // Fetch the pad account
    const noteAccount = await connection.getAccountInfo(note_pubkey);
    // console.log("noteAccount", noteAccount.data);
    // Deserialize the account data
    const deserializedAccountData = deserialize(
      CreateSchema,
      CreateAccount,
      noteAccount.data
    );
    console.log(
      `deserializedAccountData.title ${deserializedAccountData.title}`
    );
      console.log(
      `deserializedAccountData.msg ${deserializedAccountData.msg}`
    );
    console.log("Assertions");
    const account = new CreateAccount({ title: title, msg: msg, owner: wallet2_address });  
    const binaryData = serialize(
      CreateSchema,
      account,
    );
    const testData = Buffer.from(binaryData);
    console.log("Serialized binary data:", testData);  

    // Assertions
    assert(noteAccount.owner.equals(PROGRAM_ID));
    assert.deepEqual(noteAccount.data, testData);
    assert.equal(deserializedAccountData.title, title);
    assert.equal(deserializedAccountData.msg, msg);
  });

  it("modify", async () => {
    const msg = "mod2 body";

    const modifyInstruction = new ModifyInstruction({
      id: InstructionVariant.Modify,
      title: title,
      msg: msg,
      owner: wallet2_address,
    });
    // Serialize the payload
    const ModifySerBuf = Buffer.from(
      serialize(ModifyInstructionSchema, modifyInstruction)
    );

    // get pda account
    const [note_pubkey, ] = web3.PublicKey.findProgramAddressSync([wallet.keypair.publicKey.toBuffer(), Buffer.from(title)],PROGRAM_ID);
    console.log("note_pubkey: ", note_pubkey.toBase58());

    // Create modify instruction
    const modifyIx = new web3.TransactionInstruction({
      data: ModifySerBuf,
      keys: [
        {
          pubkey: wallet.keypair.publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: note_pubkey,
          isSigner: false,
          isWritable: true,
        },
      ],
      programId: PROGRAM_ID,
    });

    // Create transaction and add the instructions
    const tx = new web3.Transaction();
    tx.add(modifyIx);
    // Send and confirm the transaction
    const txHash = await web3.sendAndConfirmTransaction(connection, tx, [
      wallet.keypair
    ]).catch(error => {console.error(error);});
    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

    // Fetch the pad account
    const noteAccount = await connection.getAccountInfo(note_pubkey);
    // console.log("noteAccount", noteAccount.data);
    // Deserialize the account data
    const deserializedAccountData = deserializeUnchecked(
      CreateSchema,
      CreateAccount,
      noteAccount.data
    );
    console.log(
      `deserializedAccountData.title ${deserializedAccountData.title}`
    );
      console.log(
      `deserializedAccountData.msg ${deserializedAccountData.msg}`
    );
    console.log("Assertions");
    const account = new CreateAccount({ title: title, msg: msg, owner: wallet2_address });  
    const binaryData = serialize(
      CreateSchema,
      account,
    );
    const testData = Buffer.from(binaryData);
    console.log("query note account data:", noteAccount.data);  
    console.log("Serialized binary data:", testData);  

    // Assertions
    assert(noteAccount.owner.equals(PROGRAM_ID));
    assert.equal(deserializedAccountData.title, title);
    assert.equal(deserializedAccountData.msg, msg);
  });

// 需要调整不同钱包看到授权效果
  it("modify_another_wallet", async () => {
    const msg = "mod2 body";

    const modifyInstruction = new ModifyInstruction({
      id: InstructionVariant.Modify,
      title: title,
      msg: msg,
      owner: wallet2_address,
    });
    // Serialize the payload
    const ModifySerBuf = Buffer.from(
      serialize(ModifyInstructionSchema, modifyInstruction)
    );

    // get pda account
    const [note_pubkey, ] = web3.PublicKey.findProgramAddressSync([Buffer.from(new Uint8Array(wallet1_address_arr)), Buffer.from(title)],PROGRAM_ID);
    console.log("note_pubkey: ", note_pubkey.toBase58());

    // Create modify instruction
    const modifyIx = new web3.TransactionInstruction({
      data: ModifySerBuf,
      keys: [
        {
          pubkey: wallet.keypair.publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: note_pubkey,
          isSigner: false,
          isWritable: true,
        },
      ],
      programId: PROGRAM_ID,
    });

    // Create transaction and add the instructions
    const tx = new web3.Transaction();
    tx.add(modifyIx);
    // Send and confirm the transaction
    const txHash = await web3.sendAndConfirmTransaction(connection, tx, [
      wallet.keypair
    ]).catch(error => {console.error(error);});
    console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

    // Fetch the pad account
    const noteAccount = await connection.getAccountInfo(note_pubkey);
    // console.log("noteAccount", noteAccount.data);
    // Deserialize the account data
    const deserializedAccountData = deserializeUnchecked(
      CreateSchema,
      CreateAccount,
      noteAccount.data
    );
    console.log(
      `deserializedAccountData.title ${deserializedAccountData.title}`
    );
      console.log(
      `deserializedAccountData.msg ${deserializedAccountData.msg}`
    );
    console.log("Assertions");
    const account = new CreateAccount({ title: title, msg: msg, owner: wallet2_address });  
    const binaryData = serialize(
      CreateSchema,
      account,
    );
    const testData = Buffer.from(binaryData);
    console.log("query note account data:", noteAccount.data);  
    console.log("Serialized binary data:", testData);  

    // Assertions
    assert(noteAccount.owner.equals(PROGRAM_ID));
    assert.equal(deserializedAccountData.title, title);
    assert.equal(deserializedAccountData.msg, msg);
  });


  // it("greet", async () => {
  //   // Create greetings account 
  //   // const greetingAccountKp = web3.Keypair.fromSecretKey(new Uint8Array([129,86,149,8,187,226,234,120,219,94,172,231,176,209,154,30,216,208,22,48,222,150,93,111,74,112,166,27,29,12,197,210,75,152,160,186,52,97,110,29,109,140,10,144,107,194,246,74,159,87,202,51,169,155,152,200,171,243,62,43,123,126,163,122]));
  //   const greetingAccountKp = new web3.Keypair();

  //   /**
  //    * The expected size of each greeting account.
  //    */
  //   const GREETING_SIZE = borsh.serialize(
  //     GreetingSchema,
  //     new GreetingAccount()
  //   ).length;

  //   const lamports = await connection.getMinimumBalanceForRentExemption(
  //     GREETING_SIZE
  //   );
  //   const createGreetingAccountIx = web3.SystemProgram.createAccount({
  //     fromPubkey: wallet.keypair.publicKey,
  //     lamports,
  //     newAccountPubkey: greetingAccountKp.publicKey,
  //     programId: PROGRAM_ID,
  //     space: GREETING_SIZE,
  //   });

  //   const helloIx = new GreetingInstruction({
  //     id: InstructionVariant.Greeting,
  //     counter: 3,
  //   });

  //   // Serialize the payload
  //   const helloSerBuf = Buffer.from(
  //     serialize(GreetingInstructionSchema, helloIx)
  //   );

  //   // Create greet instruction
  //   const greetIx = new web3.TransactionInstruction({
  //     data: helloSerBuf,
  //     keys: [
  //       {
  //         pubkey: greetingAccountKp.publicKey,
  //         isSigner: false,
  //         isWritable: true,
  //       },
  //     ],
  //     programId: PROGRAM_ID,
  //   });

  //   // Create transaction and add the instructions
  //   const tx = new web3.Transaction();
  //   tx.add(createGreetingAccountIx, greetIx, greetIx);
  //   // tx.add(greetIx);

  //   // Send and confirm the transaction
  //   const txHash = await web3.sendAndConfirmTransaction(connection, tx, [
  //     wallet.keypair,
  //     greetingAccountKp,
  //   ]);
  //   console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

  //   // Fetch the greetings account
  //   const greetingAccount = await connection.getAccountInfo(
  //     greetingAccountKp.publicKey
  //   ).catch(error => {console.error(error);});

  //   // Deserialize the account data
  //   const deserializedAccountData = borsh.deserialize(
  //     GreetingSchema,
  //     GreetingAccount,
  //     greetingAccount.data
  //   );

  //   console.log(
  //     `deserializedAccountData.counter ${deserializedAccountData.counter}`
  //   );

  //   // Assertions
  //   assert.equal(greetingAccount.lamports, lamports);
  //   assert(greetingAccount.owner.equals(PROGRAM_ID));
  //   assert.equal(deserializedAccountData.counter, 6);
  // });

});
