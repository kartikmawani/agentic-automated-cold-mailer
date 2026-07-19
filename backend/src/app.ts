import express from 'express';
import cors from 'cors';
import {Request as req,Response as res} from 'express';
const app=express();
const PORT=4000;

app.use(cors({origin:'*'}));
app.use(express.json());

app.use('/api/leads',(req,res)=>{
   try{
    const companyName=req.body;
    if(!companyName){
         
        res.status(300).json({
            message:'companyName is not included in the request'
        })
    }
    return[
        res.status(202).json({
            message:'got the companyName',
            companyName:companyName
        })
    ]
   }
   catch(error){
 
    res.status(500).json({
        status:error,
         message:"Error getting the companyName in the backend "
    })
   }
})
app.listen(PORT,()=>{
    console.log(`Server is running on ${PORT}`)
})