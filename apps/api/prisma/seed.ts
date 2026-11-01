import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const db=new PrismaClient();
async function main(){
 const passwordHash=await bcrypt.hash('Naker@123',12);
 const user=await db.user.upsert({where:{email:'demo@naker.com'},update:{},create:{name:'Naker Distribuidor',email:'demo@naker.com',passwordHash,phone:'5511999999999',slug:'naker-demo'}});
 const names=['Mercearia','Bebidas','Higiene'];const cats:any={};for(const name of names)cats[name]=await db.category.upsert({where:{userId_name:{userId:user.id,name}},update:{},create:{userId:user.id,name}});
 const products=[['Arroz Premium 5kg',2490,'Mercearia'],['Feijão Carioca 1kg',899,'Mercearia'],['Açúcar Refinado 1kg',549,'Mercearia'],['Café Especial 500g',1890,'Mercearia'],['Óleo de Soja 900ml',799,'Mercearia'],['Refrigerante Cola 2L',999,'Bebidas'],['Água Mineral 1.5L',299,'Bebidas'],['Suco de Uva Integral',1490,'Bebidas'],['Detergente Neutro',299,'Higiene'],['Sabão em Pó 1kg',1290,'Higiene']] as const;
 const saved=[];for(const [name,priceCents,cat] of products)saved.push(await db.product.upsert({where:{id:`seed-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`},update:{},create:{id:`seed-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,userId:user.id,name,priceCents,imageUrl:null,categoryId:cats[cat].id,description:`Produto selecionado Naker: ${name}.`}}));
 const customerData=[['Mercado Central','5511988881111'],['Empório Imperial','5511977772222'],['Mercearia da Praça','5511966663333']] as const;
 for(let i=0;i<customerData.length;i++){const [name,phone]=customerData[i];const customer=await db.customer.upsert({where:{id:`seed-customer-${i+1}`},update:{},create:{id:`seed-customer-${i+1}`,userId:user.id,name,phone,notes:'Cliente de demonstração'}});for(const p of saved.slice(0,4))await db.customerPrice.upsert({where:{customerId_productId:{customerId:customer.id,productId:p.id}},update:{},create:{customerId:customer.id,productId:p.id,priceCents:Math.round(p.priceCents*(1+(i-1)*.05))}})}
 console.log('Seed pronto. Login: demo@naker.com / Naker@123');
}
main().finally(()=>db.$disconnect());
